const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

require('dotenv').config();

const authRouter = require('./routes/auth');
const purchasesRouter = require('./routes/purchases');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/purchases', purchasesRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
