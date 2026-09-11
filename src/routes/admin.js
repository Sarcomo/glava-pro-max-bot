const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const config = require('../config');
const { readLeads } = require('../services/leads');
const {
  readProjects,
  createProject,
  updateProject,
  deleteProject,
  saveUploadedPhotos,
} = require('../services/catalog');
const { countSubscribers, upsertSubscriber, getActiveSubscribers } = require('../services/subscribers');
const { sendBroadcast, readHistory } = require('../services/broadcast');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter(_req, file, cb) {
    const ok = /^image\/(jpeg|png|webp)$/i.test(file.mimetype);
    cb(ok ? null : new Error('Только JPG, PNG или WebP'), ok);
  },
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', { timeZone: 'Asia/Irkutsk' });
  } catch {
    return iso;
  }
}

function checkAdminKey(provided) {
  const secret = config.adminSecret;
  if (!secret || !provided) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(String(provided)),
      Buffer.from(String(secret)),
    );
  } catch {
    return false;
  }
}

function requireAdmin(req, res) {
  if (!config.adminSecret) {
    res.status(503).json({ ok: false, error: 'admin_not_configured' });
    return false;
  }
  const key = req.query.key || req.headers['x-admin-key'] || req.body?.key;
  if (!checkAdminKey(key)) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return false;
  }
  return true;
}

function adminNav(active, key) {
  const q = `?key=${encodeURIComponent(key)}`;
  return `
    <nav class="nav">
      <a class="${active === 'catalog' ? 'on' : ''}" href="/admin/catalog${q}">Каталог</a>
      <a class="${active === 'broadcast' ? 'on' : ''}" href="/admin/broadcast${q}">Рассылка</a>
      <a class="${active === 'leads' ? 'on' : ''}" href="/admin/leads${q}">Заявки</a>
    </nav>`;
}

function sharedStyles() {
  return `
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #f4f6f8; color: #1a1a1a; }
    header { background: #1e3a5f; color: #fff; padding: 18px 24px 14px; }
    header h1 { margin: 0 0 6px; font-size: 22px; }
    header p { margin: 0; opacity: 0.85; font-size: 14px; }
    .nav { display: flex; gap: 8px; margin-top: 14px; }
    .nav a { color: #fff; text-decoration: none; padding: 8px 12px; border-radius: 8px; background: rgba(255,255,255,.12); font-size: 14px; font-weight: 600; }
    .nav a.on { background: #f15a29; }
    .wrap { padding: 20px 24px 40px; max-width: 1100px; margin: 0 auto; }
    .meta { margin-bottom: 16px; color: #555; font-size: 14px; }
    .grid { display: grid; gap: 14px; }
    .card {
      background: #fff; border-radius: 14px; padding: 14px; display: grid;
      grid-template-columns: 120px 1fr auto; gap: 14px; align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,.06);
    }
    .card img { width: 120px; height: 84px; object-fit: cover; border-radius: 10px; background: #ddd; }
    .card h3 { margin: 0 0 6px; font-size: 18px; }
    .card p { margin: 0; color: #666; font-size: 13px; line-height: 1.4; }
    .actions { display: flex; flex-direction: column; gap: 8px; }
    button, .btn {
      border: 0; border-radius: 10px; padding: 10px 14px; font: inherit; font-weight: 600;
      cursor: pointer; text-decoration: none; display: inline-block; text-align: center;
    }
    .btn-danger { background: #ffe8e6; color: #b42318; }
    .btn-primary { background: #f15a29; color: #fff; }
    .btn-secondary { background: #eef2f7; color: #1e3a5f; }
    .panel {
      background: #fff; border-radius: 14px; padding: 18px; margin-bottom: 22px;
      box-shadow: 0 2px 8px rgba(0,0,0,.06);
    }
    .panel h2 { margin: 0 0 14px; font-size: 18px; }
    form { display: grid; gap: 12px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    label { display: grid; gap: 6px; font-size: 12px; font-weight: 700; color: #667; text-transform: uppercase; letter-spacing: .04em; }
    input, textarea, select {
      width: 100%; border: 1px solid #d8dee6; border-radius: 10px; padding: 11px 12px;
      font: inherit; font-size: 15px; color: #111; background: #fff;
    }
    textarea { min-height: 84px; resize: vertical; }
    .hint { color: #888; font-size: 13px; margin-top: -4px; }
    .toast {
      position: fixed; right: 16px; bottom: 16px; background: #1f1a17; color: #fff;
      padding: 12px 14px; border-radius: 12px; font-size: 14px; display: none; z-index: 20;
    }
    .toast.show { display: block; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); font-size: 13px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e8ecf0; vertical-align: top; }
    th { background: #eef2f7; font-weight: 600; white-space: nowrap; }
    .tag { display: inline-block; background: #e8f0fe; color: #1e3a5f; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
    .comment { max-width: 220px; word-break: break-word; color: #555; }
    .empty { padding: 40px; text-align: center; color: #666; background: #fff; border-radius: 12px; }
    .btn-edit { background: #e8f0fe; color: #1e3a5f; }
    .photo-thumbs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
    .photo-thumbs .thumb {
      position: relative; width: 72px; height: 72px; border-radius: 10px; overflow: hidden;
      background: #eee;
    }
    .photo-thumbs .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .photo-thumbs .thumb button {
      position: absolute; top: 2px; right: 2px; width: 22px; height: 22px; border: 0;
      border-radius: 50%; background: rgba(0,0,0,.65); color: #fff; font-size: 12px;
      cursor: pointer; padding: 0; line-height: 22px;
    }
    .form-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .panel.editing { outline: 2px solid #f15a29; outline-offset: 2px; }
    @media (max-width: 720px) {
      .card { grid-template-columns: 1fr; }
      .row { grid-template-columns: 1fr; }
      .actions { flex-direction: row; }
    }
  `;
}

function renderLeadsPage(leads, key) {
  const rows = leads.map((lead) => `
    <tr>
      <td>${escapeHtml(formatDate(lead.datetime))}</td>
      <td><span class="tag">${escapeHtml(lead.lead_type)}</span></td>
      <td><strong>${escapeHtml(lead.name || '—')}</strong><br><a href="tel:${escapeHtml(lead.phone)}">${escapeHtml(lead.phone || '—')}</a></td>
      <td>${escapeHtml(lead.technology || '—')}</td>
      <td>${escapeHtml(lead.area || '—')}</td>
      <td>${escapeHtml(lead.floors || '—')}</td>
      <td>${escapeHtml(lead.bedrooms || '—')}</td>
      <td>${escapeHtml(lead.completion || '—')}</td>
      <td>${escapeHtml(lead.budget || '—')}</td>
      <td>${escapeHtml(lead.plot || '—')}</td>
      <td class="comment">${escapeHtml(lead.comment || '—')}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Заявки — Глава Про</title>
  <style>${sharedStyles()}</style>
</head>
<body>
  <header>
    <h1>Админка — Глава Про</h1>
    <p>Заявки из бота и мини-приложения</p>
    ${adminNav('leads', key)}
  </header>
  <div class="wrap">
    <div class="meta">Всего заявок: <strong>${leads.length}</strong></div>
    ${leads.length ? `<table>
      <thead>
        <tr>
          <th>Дата</th><th>Тип</th><th>Контакт</th><th>Технология</th><th>Площадь</th>
          <th>Этажи</th><th>Спальни</th><th>Комплектация</th><th>Бюджет</th><th>Участок</th><th>Комментарий</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>` : '<div class="empty">Пока нет заявок</div>'}
  </div>
</body>
</html>`;
}

function renderCatalogPage(projects, key) {
  const cards = projects.map((p) => {
    const photo = (p.photos && p.photos[0]) ? `/app/${p.photos[0]}` : '';
    const photoCount = Array.isArray(p.photos) ? p.photos.length : 0;
    return `
      <article class="card" data-id="${escapeHtml(p.id)}">
        ${photo ? `<img src="${escapeHtml(photo)}" alt="">` : '<div style="width:120px;height:84px;background:#eee;border-radius:10px"></div>'}
        <div>
          <h3>${escapeHtml(p.name)}</h3>
          <p>${escapeHtml(p.area)} м² · ${escapeHtml(p.floors)} · ${escapeHtml(p.realCostLabel || '—')}<br>${escapeHtml(p.location || '')}<br>Фото: ${photoCount}</p>
        </div>
        <div class="actions">
          <button type="button" class="btn-edit" data-edit="${escapeHtml(p.id)}">Изменить</button>
          <button type="button" class="btn-danger" data-delete="${escapeHtml(p.id)}">Удалить</button>
        </div>
      </article>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Каталог — админка Глава Про</title>
  <style>${sharedStyles()}</style>
</head>
<body>
  <header>
    <h1>Админка — Глава Про</h1>
    <p>Добавление, редактирование и удаление проектов</p>
    ${adminNav('catalog', key)}
  </header>
  <div class="wrap">
    <section class="panel" id="formPanel">
      <h2 id="formTitle">Новый проект</h2>
      <form id="projectForm">
        <input type="hidden" name="editId" id="editId" value="">
        <div class="row">
          <label>Название<input name="name" id="fName" required placeholder="Черноруд"></label>
          <label>Площадь, м²<input name="area" id="fArea" type="number" min="1" step="1" required placeholder="46"></label>
        </div>
        <div class="row">
          <label>Этажность<input name="floors" id="fFloors" required placeholder="1 этаж" value="1 этаж"></label>
          <label>Спальни<input name="bedrooms" id="fBedrooms" type="number" min="0" step="1" required placeholder="2"></label>
        </div>
        <div class="row">
          <label>Финальная стоимость, ₽<input name="realCost" id="fRealCost" required placeholder="4720000"></label>
          <label id="photosLabel">Фото (можно несколько)<input name="photos" id="fPhotos" type="file" accept="image/jpeg,image/png,image/webp" multiple required></label>
        </div>
        <div id="currentPhotosWrap" style="display:none">
          <label>Текущие фото</label>
          <div class="photo-thumbs" id="currentPhotos"></div>
          <p class="hint">Крестик удаляет фото. Новые файлы ниже добавятся к оставшимся.</p>
        </div>
        <label>Геометка / адрес<input name="location" id="fLocation" required placeholder="Иркутская область, пос. Черноруд"></label>
        <label>Ссылка на карту (необязательно)<input name="mapsUrl" id="fMapsUrl" placeholder="https://yandex.ru/maps/..."></label>
        <label>Описание<textarea name="description" id="fDescription" required placeholder="Коротко о доме"></textarea></label>
        <div class="row">
          <label>Автор отзыва<input name="reviewAuthor" id="fReviewAuthor" required placeholder="Анна К."></label>
          <label>Оценка<select name="reviewRating" id="fReviewRating"><option>5</option><option>4</option><option>3</option></select></label>
        </div>
        <label>Текст отзыва<textarea name="reviewText" id="fReviewText" required placeholder="Построили быстро..."></textarea></label>
        <p class="hint" id="formHint">Фото: можно выбрать несколько сразу (Ctrl / Cmd). После сохранения проект сразу появится в каталоге.</p>
        <div class="form-actions">
          <button class="btn-primary" type="submit" id="submitBtn">Добавить проект</button>
          <button class="btn-secondary" type="button" id="cancelEditBtn" style="display:none">Отмена</button>
        </div>
      </form>
    </section>

    <div class="meta">Проектов в каталоге: <strong id="count">${projects.length}</strong></div>
    <div class="grid" id="list">${cards || '<div class="empty">Пока нет проектов</div>'}</div>
  </div>
  <div class="toast" id="toast"></div>
  <script>
    const KEY = ${JSON.stringify(key)};
    const PROJECTS = ${JSON.stringify(projects)};
    let existingPhotos = [];
    const toast = document.getElementById('toast');
    const form = document.getElementById('projectForm');
    const formPanel = document.getElementById('formPanel');
    const formTitle = document.getElementById('formTitle');
    const submitBtn = document.getElementById('submitBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const photosInput = document.getElementById('fPhotos');
    const currentPhotosWrap = document.getElementById('currentPhotosWrap');
    const currentPhotosEl = document.getElementById('currentPhotos');

    function showToast(text) {
      toast.textContent = text;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2800);
    }

    function renderExistingPhotos() {
      if (!existingPhotos.length) {
        currentPhotosEl.innerHTML = '<span class="hint">Нет фото</span>';
        return;
      }
      currentPhotosEl.innerHTML = existingPhotos.map(function (src, i) {
        return '<div class="thumb">'
          + '<img src="/app/' + src + '" alt="">'
          + '<button type="button" data-remove-photo="' + i + '" title="Удалить">×</button>'
          + '</div>';
      }).join('');
    }

    function resetCreateMode() {
      form.reset();
      document.getElementById('editId').value = '';
      document.getElementById('fFloors').value = '1 этаж';
      existingPhotos = [];
      currentPhotosWrap.style.display = 'none';
      photosInput.required = true;
      formTitle.textContent = 'Новый проект';
      submitBtn.textContent = 'Добавить проект';
      cancelEditBtn.style.display = 'none';
      formPanel.classList.remove('editing');
      document.getElementById('formHint').textContent =
        'Фото: можно выбрать несколько сразу (Ctrl / Cmd). После сохранения проект сразу появится в каталоге.';
    }

    function startEdit(id) {
      const p = PROJECTS.find((x) => x.id === id);
      if (!p) return;
      document.getElementById('editId').value = p.id;
      document.getElementById('fName').value = p.name || '';
      document.getElementById('fArea').value = p.area || '';
      document.getElementById('fFloors').value = p.floors || '1 этаж';
      document.getElementById('fBedrooms').value = p.bedrooms || '';
      document.getElementById('fRealCost').value = p.realCost || '';
      document.getElementById('fLocation').value = p.location || '';
      document.getElementById('fMapsUrl').value = p.mapsUrl || '';
      document.getElementById('fDescription').value = p.description || '';
      document.getElementById('fReviewAuthor').value = (p.review && p.review.author) || '';
      document.getElementById('fReviewText').value = (p.review && p.review.text) || '';
      document.getElementById('fReviewRating').value = String((p.review && p.review.rating) || 5);
      existingPhotos = Array.isArray(p.photos) ? p.photos.slice() : [];
      photosInput.value = '';
      photosInput.required = false;
      currentPhotosWrap.style.display = 'block';
      renderExistingPhotos();
      formTitle.textContent = 'Редактирование: ' + p.name;
      submitBtn.textContent = 'Сохранить изменения';
      cancelEditBtn.style.display = '';
      formPanel.classList.add('editing');
      document.getElementById('formHint').textContent =
        'Можно изменить поля и/или добавить новые фото. Пустое поле фото — оставить текущие.';
      formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    cancelEditBtn.addEventListener('click', resetCreateMode);

    currentPhotosEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-photo]');
      if (!btn) return;
      const idx = Number(btn.dataset.removePhoto);
      existingPhotos.splice(idx, 1);
      renderExistingPhotos();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('editId').value.trim();
      const isEdit = Boolean(editId);
      if (isEdit && !existingPhotos.length && (!photosInput.files || !photosInput.files.length)) {
        showToast('Оставьте хотя бы одно фото');
        return;
      }
      submitBtn.disabled = true;
      const prevLabel = submitBtn.textContent;
      submitBtn.textContent = 'Сохраняем…';
      try {
        const fd = new FormData(form);
        fd.delete('editId');
        if (isEdit) {
          fd.append('existingPhotos', JSON.stringify(existingPhotos));
        }
        const url = isEdit
          ? '/admin/api/projects/' + encodeURIComponent(editId) + '?key=' + encodeURIComponent(KEY)
          : '/admin/api/projects?key=' + encodeURIComponent(KEY);
        const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          showToast(data.error || 'Не удалось сохранить');
          submitBtn.disabled = false;
          submitBtn.textContent = prevLabel;
          return;
        }
        location.reload();
      } catch (err) {
        showToast('Нет связи с сервером');
        submitBtn.disabled = false;
        submitBtn.textContent = prevLabel;
      }
    });

    document.getElementById('list').addEventListener('click', async (e) => {
      const editBtn = e.target.closest('[data-edit]');
      if (editBtn) {
        startEdit(editBtn.dataset.edit);
        return;
      }
      const btn = e.target.closest('[data-delete]');
      if (!btn) return;
      const id = btn.dataset.delete;
      if (!confirm('Удалить проект «' + id + '» из каталога?')) return;
      btn.disabled = true;
      try {
        const res = await fetch('/admin/api/projects/' + encodeURIComponent(id) + '?key=' + encodeURIComponent(KEY), {
          method: 'DELETE',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          showToast(data.error || 'Не удалось удалить');
          btn.disabled = false;
          return;
        }
        location.reload();
      } catch (err) {
        showToast('Нет связи с сервером');
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}

function renderBroadcastPage({ counts, history, key }) {
  const historyRows = (history || []).slice(0, 15).map((item) => `
    <tr>
      <td>${escapeHtml(formatDate(item.datetime))}</td>
      <td class="comment">${escapeHtml(item.text)}</td>
      <td>${item.sent ?? 0} / ${item.total ?? 0}</td>
      <td>${item.failed ?? 0}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Рассылка — админка Глава Про</title>
  <style>${sharedStyles()}</style>
</head>
<body>
  <header>
    <h1>Админка — Глава Про</h1>
    <p>Посты и уведомления всем, кто открывал бота</p>
    ${adminNav('broadcast', key)}
  </header>
  <div class="wrap">
    <section class="panel">
      <h2>Новый пост</h2>
      <div class="meta">
        Подписчиков активно: <strong id="activeCount">${counts.active}</strong>
        · всего в базе: <strong>${counts.total}</strong>
      </div>
      <form id="broadcastForm">
        <label>Текст сообщения
          <textarea name="text" id="broadcastText" required placeholder="Новый объект в каталоге! Заходите смотреть готовые проекты."></textarea>
        </label>
        <label style="text-transform:none;font-weight:500;display:flex;gap:8px;align-items:center;letter-spacing:0">
          <input type="checkbox" name="withCatalogButton" id="withCatalogButton" checked style="width:auto">
          Добавить кнопку «Открыть каталог»
        </label>
        <p class="hint">Сообщение уйдёт всем, кто хотя бы раз нажал «Старт» или писал боту. Отправка идёт с небольшой паузой между людьми.</p>
        <button class="btn-primary" type="submit" id="sendBtn">Отправить всем (${counts.active})</button>
      </form>
      <div id="result" class="meta" style="margin-top:14px;display:none"></div>
    </section>

    <section class="panel">
      <h2>История рассылок</h2>
      ${historyRows ? `<table>
        <thead><tr><th>Дата</th><th>Текст</th><th>Доставлено</th><th>Ошибки</th></tr></thead>
        <tbody>${historyRows}</tbody>
      </table>` : '<div class="empty">Пока не было рассылок</div>'}
    </section>
  </div>
  <div class="toast" id="toast"></div>
  <script>
    const KEY = ${JSON.stringify(key)};
    const toast = document.getElementById('toast');
    function showToast(text) {
      toast.textContent = text;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3200);
    }

    document.getElementById('broadcastForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = document.getElementById('broadcastText').value.trim();
      if (text.length < 3) {
        showToast('Введите текст поста');
        return;
      }
      const active = Number(document.getElementById('activeCount').textContent) || 0;
      if (!active) {
        showToast('Пока нет подписчиков. Пусть клиенты нажмут Старт в боте.');
        return;
      }
      if (!confirm('Отправить пост ' + active + ' подписчикам?')) return;

      const btn = document.getElementById('sendBtn');
      btn.disabled = true;
      btn.textContent = 'Отправляем…';
      const resultEl = document.getElementById('result');
      resultEl.style.display = 'block';
      resultEl.textContent = 'Идёт рассылка, подождите…';

      try {
        const res = await fetch('/admin/api/broadcast?key=' + encodeURIComponent(KEY), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            withCatalogButton: document.getElementById('withCatalogButton').checked,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          showToast(data.error || 'Не удалось отправить');
          resultEl.textContent = data.error || 'Ошибка';
          btn.disabled = false;
          btn.textContent = 'Отправить всем (' + active + ')';
          return;
        }
        resultEl.textContent = 'Готово: доставлено ' + data.sent + ' из ' + data.total
          + (data.failed ? (', ошибок: ' + data.failed) : '');
        showToast('Рассылка завершена');
        setTimeout(() => location.reload(), 1200);
      } catch (err) {
        showToast('Нет связи с сервером');
        resultEl.textContent = 'Нет связи с сервером';
        btn.disabled = false;
        btn.textContent = 'Отправить всем (' + active + ')';
      }
    });
  </script>
</body>
</html>`;
}

async function seedSubscribersFromLeads() {
  try {
    const leads = await readLeads();
    for (const lead of leads) {
      if (lead.user_id) {
        await upsertSubscriber({
          userId: lead.user_id,
          name: lead.name || '',
        });
      }
    }
  } catch (err) {
    console.warn('[SUB] seed from leads failed:', err.message);
  }
}

function registerAdminRoutes(app) {
  app.get('/admin', (req, res) => {
    const key = req.query.key || '';
    const q = key ? `?key=${encodeURIComponent(key)}` : '';
    res.redirect(`/admin/catalog${q}`);
  });

  app.get('/admin/leads', async (req, res) => {
    if (!config.adminSecret) {
      return res.status(503).send('Админ-панель не настроена. Укажите ADMIN_SECRET в .env');
    }
    if (!checkAdminKey(req.query.key)) {
      return res.status(401).send('Неверный ключ доступа');
    }
    try {
      const leads = await readLeads();
      res.status(200).send(renderLeadsPage(leads, req.query.key));
    } catch (err) {
      console.error('Admin leads error:', err.message);
      res.status(500).send('Ошибка загрузки заявок');
    }
  });

  app.get('/admin/catalog', async (req, res) => {
    if (!config.adminSecret) {
      return res.status(503).send('Админ-панель не настроена. Укажите ADMIN_SECRET в .env');
    }
    if (!checkAdminKey(req.query.key)) {
      return res.status(401).send('Неверный ключ доступа');
    }
    try {
      const projects = await readProjects();
      res.status(200).send(renderCatalogPage(projects, req.query.key));
    } catch (err) {
      console.error('Admin catalog error:', err.message);
      res.status(500).send('Ошибка загрузки каталога');
    }
  });

  app.post('/admin/api/projects', upload.array('photos', 12), async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const body = req.body || {};
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ ok: false, error: 'Добавьте хотя бы одно фото' });
      }
      const photos = await saveUploadedPhotos(files, body.name);
      const project = await createProject({
        ...body,
        photos,
      });
      return res.json({ ok: true, project });
    } catch (err) {
      console.error('Admin create project:', err.message);
      const map = {
        name_required: 'Укажите название',
        photo_required: 'Добавьте фото',
      };
      return res.status(400).json({ ok: false, error: map[err.code] || err.message || 'Ошибка сохранения' });
    }
  });

  app.put('/admin/api/projects/:id', upload.array('photos', 12), async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const body = req.body || {};
      const current = (await readProjects()).find((p) => p.id === req.params.id);
      if (!current) {
        return res.status(404).json({ ok: false, error: 'Проект не найден' });
      }

      let photos = Array.isArray(current.photos) ? current.photos.slice() : [];
      if (Object.prototype.hasOwnProperty.call(body, 'existingPhotos')) {
        try {
          const parsed = JSON.parse(body.existingPhotos || '[]');
          photos = Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
          return res.status(400).json({ ok: false, error: 'Некорректный список фото' });
        }
      }

      const files = req.files || [];
      if (files.length) {
        const uploaded = await saveUploadedPhotos(files, body.name || req.params.id);
        photos = [...photos, ...uploaded];
      }

      if (!photos.length) {
        return res.status(400).json({ ok: false, error: 'Оставьте хотя бы одно фото' });
      }

      const project = await updateProject(req.params.id, {
        ...body,
        photos,
      });
      return res.json({ ok: true, project });
    } catch (err) {
      if (err.code === 'not_found') {
        return res.status(404).json({ ok: false, error: 'Проект не найден' });
      }
      return res.status(400).json({ ok: false, error: err.message || 'Ошибка' });
    }
  });

  app.get('/admin/broadcast', async (req, res) => {
    if (!config.adminSecret) {
      return res.status(503).send('Админ-панель не настроена. Укажите ADMIN_SECRET в .env');
    }
    if (!checkAdminKey(req.query.key)) {
      return res.status(401).send('Неверный ключ доступа');
    }
    try {
      await seedSubscribersFromLeads();
      const counts = await countSubscribers();
      const history = await readHistory();
      res.status(200).send(renderBroadcastPage({ counts, history, key: req.query.key }));
    } catch (err) {
      console.error('Admin broadcast page error:', err.message);
      res.status(500).send('Ошибка загрузки рассылки');
    }
  });

  app.post('/admin/api/broadcast', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      await seedSubscribersFromLeads();
      const result = await sendBroadcast({
        text: req.body?.text,
        withCatalogButton: req.body?.withCatalogButton !== false,
      });
      return res.json({ ok: true, ...result });
    } catch (err) {
      console.error('Admin broadcast error:', err.message);
      const map = { text_required: 'Введите текст поста' };
      return res.status(400).json({ ok: false, error: map[err.code] || err.message || 'Ошибка рассылки' });
    }
  });

  app.delete('/admin/api/projects/:id', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      await deleteProject(req.params.id);
      return res.json({ ok: true });
    } catch (err) {
      if (err.code === 'not_found') {
        return res.status(404).json({ ok: false, error: 'Проект не найден' });
      }
      return res.status(500).json({ ok: false, error: 'Ошибка удаления' });
    }
  });
}

module.exports = { registerAdminRoutes };
