const express = require('express');
const tasksRouter = require('./routes/tasks');
const healthRouter = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/tasks', tasksRouter);
app.use('/health', healthRouter);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Task API server listening on port ${PORT}`);
  });
}

module.exports = app;
