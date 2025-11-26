# Configuration Email

Ce document décrit comment configurer l'envoi d'emails pour les webinaires.

## Variables d'environnement

Ajoutez ces variables dans votre fichier `.env` :

```env
# Activation de l'envoi d'emails
EMAIL_ENABLED=true

# Provider email (smtp, sendgrid, ses, resend, mailgun)
EMAIL_PROVIDER=smtp

# Expéditeur
EMAIL_FROM=noreply@asgf.org
EMAIL_FROM_NAME=ASGF

# Configuration SMTP (si EMAIL_PROVIDER=smtp)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@example.com
SMTP_PASS=votre-mot-de-passe

# Configuration SendGrid (si EMAIL_PROVIDER=sendgrid)
SENDGRID_API_KEY=votre-api-key

# Configuration AWS SES (si EMAIL_PROVIDER=ses)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=votre-access-key
AWS_SECRET_ACCESS_KEY=votre-secret-key

# Configuration Resend (si EMAIL_PROVIDER=resend)
RESEND_API_KEY=votre-api-key

# Configuration Mailgun (si EMAIL_PROVIDER=mailgun)
MAILGUN_API_KEY=votre-api-key
MAILGUN_DOMAIN=votre-domaine.com
```

## Installation des dépendances

Pour utiliser Nodemailer (SMTP) :
```bash
npm install nodemailer
```

Pour utiliser SendGrid :
```bash
npm install @sendgrid/mail
```

Pour utiliser AWS SES :
```bash
npm install @aws-sdk/client-ses
```

Pour utiliser Resend :
```bash
npm install resend
```

Pour utiliser Mailgun :
```bash
npm install mailgun.js
```

## Activation

1. Définissez `EMAIL_ENABLED=true` dans votre `.env`
2. Configurez les variables selon le provider choisi
3. Installez le package correspondant
4. Décommentez et adaptez le code dans `backend/services/email.service.js`

## Fonctionnalités

- ✅ Email de confirmation d'inscription
- ✅ Email de rappel 24h avant le webinaire
- ✅ Templates HTML professionnels
- ✅ Gestion d'erreurs non-bloquante

## Notes

- Les emails sont envoyés de manière asynchrone et ne bloquent pas l'inscription
- En cas d'erreur d'envoi, l'inscription est quand même créée
- Les logs d'erreur sont enregistrés pour debugging


