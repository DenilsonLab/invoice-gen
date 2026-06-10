import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from '../src/server/routes/auth.js';
import userRoutes from '../src/server/routes/users.js';
import invoiceRoutes from '../src/server/routes/invoices.js';
import clientRoutes from '../src/server/routes/clients.js';

const app = express();

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/clients', clientRoutes);

export default app;
