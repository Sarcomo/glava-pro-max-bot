function parseContactText(text) {
  const cleaned = (text || '').trim();
  const phoneMatch = cleaned.match(/(\+?\d[\d\s\-()]{8,}\d)/);
  const phone = phoneMatch ? phoneMatch[1].replace(/\s+/g, ' ').trim() : '';
  let name = cleaned;
  if (phone) {
    name = cleaned.replace(phone, '').replace(/[,;]/g, ' ').trim();
  }
  return { name, phone };
}

function extractContactFromAttachments(attachments) {
  if (!Array.isArray(attachments)) return null;
  const contact = attachments.find((a) => a.type === 'contact');
  if (!contact?.payload) return null;

  const vcf = contact.payload.vcf_info || '';
  const phoneMatch = vcf.match(/TEL[^:]*:([+\d]+)/);
  const fnMatch = vcf.match(/FN:([^\r\n]+)/);
  return {
    name: fnMatch?.[1]?.trim() || '',
    phone: phoneMatch?.[1]?.trim() || '',
  };
}

module.exports = {
  parseContactText,
  extractContactFromAttachments,
};
