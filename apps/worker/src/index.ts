import { App } from 'sappsapi';

const app = new App();

app.get('/hello', (ctx) => ctx.text('Hello from SappsApi Worker!'));
