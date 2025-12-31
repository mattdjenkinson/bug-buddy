import { serverEnv } from "@/env";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

const smtpOptions: SMTPTransport.Options = {
  host: serverEnv.EMAIL_HOST,
  port: Number.parseInt(serverEnv.EMAIL_PORT, 10),
  secure: process.env.NODE_ENV === "production",
  auth: {
    user: serverEnv.EMAIL_USER,
    pass: serverEnv.EMAIL_PASSWORD,
  },
};

export const transporter = nodemailer.createTransport(smtpOptions);
