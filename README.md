# Puente

Interpretación en vivo para un evento. Una persona habla. Quien entra con el código o el QR elige un idioma y escucha, y lee, la misma traducción que el resto de esa sala.

Puente es un producto de [Ai Labs](https://www.ailabs.sv/) y sigue su marca: paleta morado y grafito, Alan Sans para títulos, DM Sans para texto, y el logo en `public/brand/`. Cada página termina con "Powered by Ai Labs".

La página se lee en español o en inglés. El control EN/ES está en cada pantalla y recuerda la elección en este navegador.

OpenAI cobra el audio que entra a `gpt-realtime-translate`, unos $0.034 por minuto y por idioma de salida. Cien oyentes en inglés comparten una sola sesión. Al silenciar el micrófono, o cuando se va el último oyente de un idioma, esa sesión se cierra.

## Correrlo

```bash
npm install
cp .env.example .env.local
```

Pon tu llave en `.env.local`:

```bash
OPENAI_API_KEY=sk-...
```

```bash
npm run dev
```

Abre [http://127.0.0.1:38471](http://127.0.0.1:38471). Crea un evento, abre el enlace del oyente en otra ventana y elige inglés. Sin la llave la sala abre igual y la pantalla lo dice; no hay traducción inventada.

## Cómo está armado

El speaker manda el micrófono al servidor, ya en PCM de 24 kHz. El servidor abre una sesión de OpenAI por idioma activo y reparte el audio traducido y los subtítulos a quienes eligieron ese idioma. La transcripción del original va una sola vez por evento.
