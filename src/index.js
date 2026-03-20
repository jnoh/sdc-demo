const express = require('express');
const tasksRouter = require('./routes/tasks');
const projectsRouter = require('./routes/projects');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/tasks', tasksRouter);
app.use('/projects', projectsRouter);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Task API server listening on port ${PORT}`);
  });
}

module.exports = app;
