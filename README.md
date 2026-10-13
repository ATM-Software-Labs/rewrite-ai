# Rewrite · Reescritura de textos

Herramienta de ATM Software Labs para reescribir y corregir textos de forma que se lean más claros y naturales. Conserva datos, enlaces y formato Markdown.

- **Reescribir**: estilos Natural, Académico, Sencillo y Resumen ejecutivo.
- **Corregir**: ortografía, gramática y estilo.

Revisa siempre el resultado antes de usarlo; no está pensado para ocultar la autoría de un texto ni para eludir políticas académicas.

## Arquitectura

- Cloudflare Pages (`public/`) + Pages Functions (`functions/`).
- `/api/rewrite`: llama al modelo (Groq si hay `GROQ_API_KEY`, si no Workers AI).
- `/api/auth/*`: sesión compartida con `*.trujillomingorance.com`. X y Google usan los flujos de acceso compartidos de trujillomingorance.com; `/api/auth/me` delega la verificación en guides, así que este proyecto no necesita `JWT_SECRET`.

Diseño: el de trujillomingorance.com (Outfit autoalojada, zinc + menta, claro/oscuro según el sistema).
