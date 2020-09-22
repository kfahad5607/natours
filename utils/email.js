const nodemailer = require('nodemailer');
const htmlToText = require('html-to-text');
const pug = require('pug');

//new Email(user,url).sendWelcome
module.exports = class Email {
    constructor(user, url) {
        this.to = user.email,
            this.firstName = user.name.split(' ')[0],
            this.from = `Fahad Khan <${process.env.EMAIL_FROM}>`,
            this.url = url;
    }

    newTransport() {
        if (process.env.NODE_ENV === 'production') {
            // sendgrid
            return nodemailer.createTransport({
                service: 'SendGrid',
                auth: {
                    user: process.env.SENDGRID_USERNAME,
                    pass: process.env.SENDGRID_PASSWORD
                }
            });
        }

        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    async send(template, subject) {
        // render pug template into html
        const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
            firstName: this.firstName,
            url: this.url,
            subject
        });

        // mail options
        const mailOptions = {
            from: this.from,
            to: this.to,
            subject,
            html,
            text: htmlToText.fromString(html)
        };

        // create a transport
        await this.newTransport().sendMail(mailOptions);
    }

    async sendWelcome() {
        await this.send('welcome', 'Welcome to the Natours Family!');
    }

    async sendPasswordReset() {
        await this.send('passwordReset', 'Your password reset token (valid only for 10 minutes)');
    }
};


