const { saveLead } = require('../services/leads');
const { sendMessageToUser } = require('../maxApi');
const { readProjects } = require('../services/catalog');

const ACTIONS = {
  excursion: {
    leadType: 'экскурсия',
    subject: 'Бесплатная экскурсия',
    userOk: 'Заявка на экскурсию принята. Менеджер напишет вам в течение дня.',
  },
  manager: {
    leadType: 'менеджер',
    subject: 'Связь с менеджером',
    userOk: 'Заявка менеджеру отправлена. Менеджер напишет вам в течение дня.',
  },
};

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `+7${digits}`;
  }
  return String(phone || '').trim();
}

function registerMiniAppRoutes(app) {
  app.get('/app/api/projects', async (_req, res) => {
    try {
      const projects = await readProjects();
      res.set('Cache-Control', 'no-store');
      return res.json({ ok: true, projects });
    } catch (err) {
      console.error('[MINIAPP] projects error:', err.message);
      return res.status(500).json({ ok: false, error: 'server_error', projects: [] });
    }
  });

  app.post('/app/api/lead', async (req, res) => {
    try {
      const {
        projectId,
        projectName,
        action,
        name,
        phone,
        userId,
        location,
        area,
        floors,
        bedrooms,
        realCostLabel,
      } = req.body || {};

      const actionMeta = ACTIONS[action];
      if (!actionMeta) {
        return res.status(400).json({ ok: false, error: 'unknown_action' });
      }
      if (!projectId || !projectName) {
        return res.status(400).json({ ok: false, error: 'project_required' });
      }

      const cleanName = String(name || '').trim();
      const cleanPhone = normalizePhone(phone);
      if (cleanName.length < 2) {
        return res.status(400).json({ ok: false, error: 'name_required' });
      }
      if (cleanPhone.replace(/\D/g, '').length < 11) {
        return res.status(400).json({ ok: false, error: 'phone_required' });
      }

      const lead = {
        datetime: new Date().toISOString(),
        user_id: Number(userId) || 0,
        name: cleanName,
        phone: cleanPhone,
        email: '',
        technology: '',
        area: area ? `${area} м²` : '',
        floors: floors || '',
        bedrooms: bedrooms ? String(bedrooms) : '',
        completion: '',
        budget: realCostLabel || '',
        plot: location || '',
        source: 'MAX mini-app catalog',
        lead_type: actionMeta.leadType,
        comment: [
          `${actionMeta.subject}: Проект «${projectName}»`,
          location ? `Геометка: ${location}` : '',
          realCostLabel ? `Финальная цена: ${realCostLabel}` : '',
        ].filter(Boolean).join(' | '),
      };

      await saveLead(lead);

      if (lead.user_id) {
        try {
          await sendMessageToUser(
            lead.user_id,
            `✅ ${actionMeta.userOk}\n\nПроект «${projectName}»`,
          );
        } catch (err) {
          console.error('[MINIAPP] confirm to user failed:', err.message);
        }
      }

      return res.json({ ok: true, message: actionMeta.userOk });
    } catch (err) {
      console.error('[MINIAPP] lead error:', err);
      return res.status(500).json({ ok: false, error: 'server_error' });
    }
  });
}

module.exports = { registerMiniAppRoutes };
