const leadEmails = [
    'xaa6cw6sz4kwzyzcaf9is11hsmrp6kp5aoyxqnusoew29g96r3z@contacts.idealista.com'
];

const allEmails = [
  {
    Tipo: 'enviado',
    to: 'xaa6cw6sz4kwzyzcaf9is11hsmrp6kp5aoyxqnusoew29g96r3z@contacts.idealista.com',
    created_at: '2025-12-18T09:52:39.259922+00:00'
  },
  {
    Tipo: 'recibido',
    to: 'inquilinos@acesalquiler.com',
    created_at: '2025-12-18T09:52:35.987523+00:00'
  }
];

const now = new Date();
const startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Dec 1, 2025
const endDate = new Date(now);

console.log('Period:', startDate.toISOString(), 'to', endDate.toISOString());

const validEmails = allEmails;
const emailsEnviados = validEmails.filter((e) => 
    leadEmails.includes(e.to) && 
    e.Tipo?.toLowerCase() === "enviado" &&
    new Date(e.created_at) >= startDate && 
    new Date(e.created_at) <= endDate
).length;

console.log('Emails Enviados:', emailsEnviados);
