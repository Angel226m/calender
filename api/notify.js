 // api/notify.js

const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

// Inicializa Firebase Admin solo si no se ha inicializado
if (!admin.apps.length) {
  admin.initializeApp({
    // Usa applicationDefault o admin.credential.cert con tus variables de entorno
    credential: admin.credential.applicationDefault(),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

// Configura el transportador usando Gmail y variables de entorno
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,          // Ejemplo: "angelgarayt22@gmail.com"
    pass: process.env.GMAIL_APP_PASSWORD,   // Tu contraseña de aplicación generada en Google
  }
});

module.exports = async (req, res) => {
  try {
    // Obtiene la hora actual y redondea a minutos (sin segundos)
    const now = new Date();
    now.setSeconds(0, 0);
    const currentTimestamp = admin.firestore.Timestamp.fromDate(now);

    // Define un margen de 1 minuto (60,000 ms)
    const marginMs = 60 * 1000;
    const upperBound = admin.firestore.Timestamp.fromDate(new Date(now.getTime() + marginMs));

    // Consulta la colección 'eventos' en Firestore
    const snapshot = await admin.firestore().collection('eventos')
      .where("startTime", ">=", currentTimestamp)
      .where("startTime", "<=", upperBound)
      .where("notificationSent", "==", false)
      .get();

    // Para cada evento encontrado, envía un correo y actualiza el documento
    const promises = [];
    snapshot.forEach(doc => {
      const eventData = doc.data();
      const email = eventData.userEmail;
      if (!email) return;

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: `Recordatorio: ${eventData.title || 'Evento sin título'}`,
        text: `Tienes un evento programado para el día ${eventData.start} a las ${eventData.time}. ¡No te lo pierdas!`
      };

      promises.push(
        transporter.sendMail(mailOptions)
          .then(() => {
            console.log(`Correo enviado a ${email} para el evento ${doc.id}`);
            return doc.ref.update({ notificationSent: true });
          })
          .catch(err => console.error("Error enviando correo:", err))
      );
    });

    await Promise.all(promises);
    res.status(200).json({ message: 'Notificaciones enviadas' });
  } catch (error) {
    console.error("Error en la función:", error);
    res.status(500).json({ error: error.toString() });
  }
};
