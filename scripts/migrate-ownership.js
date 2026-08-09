const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB");

  const Project = mongoose.connection.collection("projects");
  const projects = await Project.find({}).toArray();
  const projectOwners = {};
  projects.forEach((p) => {
    projectOwners[p._id.toString()] = p.userId;
  });

  const collections = [
    { name: "tasks", createdField: "createdBy", assignedField: "assignedTo" },
    { name: "notes", createdField: "createdBy" },
    { name: "documents", createdField: "userId" },
    { name: "imageassets", createdField: "uploadedBy" },
    { name: "projectdetails", createdField: "createdBy" },
    { name: "calendarevents", createdField: "userId" },
    { name: "pipelineitems", createdField: "createdBy" },
    { name: "passwords", createdField: "userId" },
  ];

  for (const collInfo of collections) {
    const coll = mongoose.connection.collection(collInfo.name);
    const items = await coll.find({}).toArray();
    let updated = 0;

    for (const item of items) {
      let needsUpdate = false;
      const updates = { $set: {} };

      const ownerId = item.projectId ? projectOwners[item.projectId.toString()] : null;

      if (!item[collInfo.createdField] && ownerId) {
        updates.$set[collInfo.createdField] = ownerId;
        needsUpdate = true;
      }

      if (collInfo.assignedField && !item[collInfo.assignedField] && ownerId) {
        updates.$set[collInfo.assignedField] = ownerId;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await coll.updateOne({ _id: item._id }, updates);
        updated++;
      }
    }
    console.log(`Updated ${updated} items in ${collInfo.name}`);
  }

  // Handle comments inside tasks
  const tasksColl = mongoose.connection.collection("tasks");
  const tasks = await tasksColl.find({}).toArray();
  let updatedTasks = 0;
  for (const task of tasks) {
    let changed = false;
    const ownerId = task.projectId ? projectOwners[task.projectId.toString()] : null;
    
    if (task.comments && ownerId) {
      task.comments.forEach(c => {
        if (!c.userId) {
          c.userId = ownerId;
          changed = true;
        }
      });
    }

    if (changed) {
      await tasksColl.updateOne({ _id: task._id }, { $set: { comments: task.comments } });
      updatedTasks++;
    }
  }
  console.log(`Updated ${updatedTasks} tasks with comments`);

  console.log("Migration complete");
  process.exit(0);
}

migrate().catch(console.error);
