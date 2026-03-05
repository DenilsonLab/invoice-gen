import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from '../src/server/routes/auth';
import userRoutes from '../src/server/routes/users';
import invoiceRoutes from '../src/server/routes/invoices';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/invoices', invoiceRoutes);

export default app;
