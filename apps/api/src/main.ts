import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());
app.use('/v1', routes);

app.listen(3001, () => console.log("API running on http://localhost:3001"));
