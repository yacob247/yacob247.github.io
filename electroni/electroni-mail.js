(function(){
  const DEFAULT_MAIL_APP_URL = "https://script.google.com/macros/s/AKfycbyYsr03oyOeBTaI2wImBWVjbsVwR0LHYT_6o0R6-vUuZVb9VmjtWiYFZgSduppvPhpj/exec";
  const OWNER_EMAIL = "envizionupdates@gmail.com";

  function getMailAppUrl(){
    return window.ELECTRONI_MAIL_APP_URL || window.ENVIZION_MAIL_APP_URL || DEFAULT_MAIL_APP_URL;
  }

  async function sendOwnerEmail({subject, text, html, topic = "electroni-update", data = {}} = {}){
    const payload = {
      to: [OWNER_EMAIL],
      recipient: OWNER_EMAIL,
      email: OWNER_EMAIL,
      subject: subject || "Electroni update",
      text: text || "",
      body: text || "",
      html: html || "",
      site: "Electroni",
      topic,
      ...data,
      sentAtLocal: new Date().toISOString(),
      sourceUrl: location.href
    };

    await fetch(getMailAppUrl(), {
      method: "POST",
      mode: "no-cors",
      headers: {"Content-Type":"text/plain;charset=utf-8"},
      body: JSON.stringify(payload)
    });
  }

 // NEW:
  async function sendUserEmail({to, subject, text, html, topic = "electroni-notification", data = {}} = {}){
    if(!to) return;
    const recipient = Array.isArray(to) ? to[0] : to;
    const payload = {
      to: Array.isArray(to) ? to : [to],
      recipient,
      email: recipient,
      subject: subject || "Electroni notification",
      text: text || "",
      body: text || "",
      html: html || "",
      site: "Electroni",
      topic,
      ...data,
      sentAtLocal: new Date().toISOString(),
      sourceUrl: location.href
    };
    await fetch(getMailAppUrl(), {
      method: "POST",
      mode: "no-cors",
      headers: {"Content-Type":"text/plain;charset=utf-8"},
      body: JSON.stringify(payload)
    });
  }

  window.ElectroniMail = {
    ownerEmail: OWNER_EMAIL,
    getMailAppUrl,
    sendOwnerEmail,
    sendUserEmail
  };
})();
