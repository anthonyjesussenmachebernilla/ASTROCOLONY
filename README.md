This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Campaña de diez soles

HORIZONTE incluye un tutorial en los soles 1–3 (explorar, reparar y repartir
energía), decisiones de supervivencia en los soles 4–6 y una investigación de
una señal ficticia en los soles 7–9. El Sol 10 cierra la historia: la señal procede
de una baliza de la propia expedición. No es una afirmación científica de NASA.

Cada sol exige visitar la consola del módulo señalado, completar su objetivo y
confirmar **Terminar el sol**. El Sol 1 requiere registrar primero la matriz de
paneles; consultar la fotografía es opcional y no bloquea el tutorial sin red.
No hay avance por cronómetro. Desde el Sol 4 se aplica un consumo educativo por
sol: 4 de energía, 4 de oxígeno, 3 de alimentos y 1 de blindaje.

Antes de confirmar se muestra el balance y se permite deshacer la decisión. Si
una reserva se agotaría, Astrobot puede ofrecer una ayuda de práctica una vez
por sol (repone cada reserva hasta un mínimo de 35 puntos, sin premio adicional).
Esa ayuda queda declarada en la bitácora. Las monedas se conceden solo al cerrar
cada sol. El resultado final conserva las reservas del cierre; seguir explorando
no cambia el desenlace ni vuelve a conceder premios.

La partida utiliza el mismo identificador local de guardado con formato versión
2, conservando mundo, modo, hallazgos y armario. Las partidas anteriores migran
al siguiente sol de tutorial pendiente; una misión antigua terminada continúa en
el Sol 4. El resultado final y la bitácora se recuperan al volver a abrir el juego.
La simulación anterior en `/game/legacy` conserva su funcionamiento independiente.

**Asistencia de SI:** ChatGPT/Codex asistió en el código, textos educativos,
ficción de la baliza y pruebas de la campaña. Los valores de recursos son modelos
didácticos, no cálculos de supervivencia validados por NASA.

## Fotografía interactiva

Entra al módulo de paneles solares, acércate a **Matriz de paneles**, pulsa **E**
y elige **Ver una imagen real**. La ficha puede consultarse otra vez después de
registrar el hallazgo, sin conceder recursos adicionales. La misión permanece
pausada y se puede salir con Escape o volver al hallazgo.

- Fotografía: **InSight's Dusty Solar Panel**, NASA Image Library `PIA25286`.
- Fuente y crédito: [NASA/JPL-Caltech](https://images.nasa.gov/details/PIA25286).
- Capturada el 24 de abril de 2022; la fecha de publicación del catálogo es distinta.
- Consulta: `/api/nasa/discovery?topic=solar-dust`, usando la API pública
  `https://images-api.nasa.gov/search?nasa_id=PIA25286&media_type=image` (sin clave).
- No usa APOD ni selecciona imágenes aleatorias. No modifica la foto ni incorpora
  imágenes generadas para sustituirla. Ante fallos de red, ofrece reintentar o continuar.
- El texto en español es una adaptación educativa; la descripción original y el
  enlace al registro de NASA se pueden desplegar dentro de la ficha.
- **Asistencia de SI:** ChatGPT/Codex asistió en el código de integración,
  presentación, textos educativos y pruebas de esta función. La fotografía es de
  NASA/JPL-Caltech; Aurora-1 y los porcentajes del juego son una simulación.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
