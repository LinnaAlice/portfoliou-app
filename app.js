const express = require("express");
const expressHandlebars = require("express-handlebars");
const sqlite3 = require("sqlite3");
const bodyParser = require("body-parser");
const expressSession = require("express-session");
const connectSqLite3 = require("connect-sqlite3");
const SQLiteStore = connectSqLite3(expressSession);
const bcrypt = require("bcrypt");

// Error messages variables

const submissionEmailMaxLength = 30;
const submissionUrlMaxLength = 70;
const submissionDescriptionMaxLength = 200;

const blogpostTitleMaxLength = 70;
const blogpostContentMaxLength = 1800;

const questionMaxLength = 200;
const answerMaxLength = 300;

// Login variables

const adminUsername = "unicorncat";
const hash = "$2b$10$jjjSoYX5tfIsEp19Je.sKe5GL78rY3H7VssdAqhp4ZVbf8NfvRXbe";

// Portfoliou-database.db

const db = new sqlite3.Database("./portfoliou-database.db");

db.run(`
CREATE TABLE IF NOT EXISTS submissions (
  submissionid INTEGER PRIMARY KEY,
  email TEXT,
  url TEXT,
  description TEXT
)
`);

db.run(`
  CREATE TABLE IF NOT EXISTS blogposts (
    blogpostid INTEGER PRIMARY KEY,
    title TEXT,
    category TEXT,
    content TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS questions (
    questionid INTEGER PRIMARY KEY,
    question TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS answers (
    answerid INTEGER PRIMARY KEY,
    answer TEXT,
    questionid INTEGER,
    FOREIGN KEY(questionid) REFERENCES questions(questionid)
  )
`);

const app = express();

app.use(express.static("public"));

// Middlewares

app.use(
  expressSession({
    store: new SQLiteStore({ db: "session-db.db" }),
    saveUninitialized: false,
    resave: false,
    secret: "dstjphfswryukpoy",
  })
);

app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

// app.use(
//   express.urlencoded({
//     extended: false,
//   })
// );

app.use(function (request, response, next) {
  const isLoggedIn = request.session.isLoggedIn;

  response.locals.isLoggedIn = isLoggedIn;

  next();
});

app.engine(
  "hbs",
  expressHandlebars.engine({
    defaultLayout: "main.hbs",
  })
);

// GET home page

app.get("/", function (request, response) {
  const model = {
    session: request.session,
  };

  response.render("home-page.hbs", model);
});

// GET submissions

app.get("/submit-page", function (request, response) {
  const query = `SELECT * FROM submissions ORDER BY submissionid DESC`;

  db.all(query, function (error, submissions) {
    const errorMessages = [];

    if (error) {
      errorMessages.push("Internal server error");
    }
    const model = {
      errorMessages,
      submissions,
    };

    response.render("submit-page.hbs", model);
  });
});

// POST submissions

app.post("/submit-page", function (request, response) {
  const email = request.body.email;
  const url = request.body.url;
  const description = request.body.description;

  const errorMessages = [];

  const emailIncludesAtSign = email.includes("@");

  if (email == "") {
    errorMessages.push("You didn't insert an email address");
  } else if (email.length > submissionEmailMaxLength) {
    errorMessages.push("Your email address can't be longer than " + submissionEmailMaxLength + " characters");
  } else if (emailIncludesAtSign == false) {
    errorMessages.push("You didn't include an @ in your email address");
  }

  if (url == "") {
    errorMessages.push("You didn't insert a URL address");
  } else if (submissionUrlMaxLength < url.length) {
    errorMessages.push("Your url address can't be longer than " + submissionUrlMaxLength + " characters");
  }

  if (description == "") {
    errorMessages.push("You didn't insert a description");
  } else if (submissionDescriptionMaxLength < description.length) {
    errorMessages.push("Your description can't be longer than " + submissionDescriptionMaxLength + " characters");
  }

  if (errorMessages.length == 0) {
    const query = `INSERT INTO submissions (email, url, description) VALUES (?, ?, ?)`;

    const values = [email, url, description];

    db.run(query, values, function (error) {
      if (error) {
        errorMessages.push("Internal server error");
        const model = {
          errorMessages,
          email,
          url,
          description,
        };
        response.render("submit-page.hbs", model);
      }
      response.redirect("/submit-page");
    });
  } else {
    const query = `SELECT * FROM submissions ORDER BY submissionid DESC`;

    db.all(query, function (error, submissions) {
      if (error) {
        errorMessages.push("Internal server error");
      }
      const model = {
        errorMessages,
        submissions,
      };
      response.render("submit-page.hbs", model);
    });
  }
});

// DELETE submission

app.post("/delete-submissions/:id", function (request, response) {
  const id = request.params.id;

  const query = `DELETE FROM submissions WHERE submissionid = ?`;

  const values = [id];

  db.run(query, values, function (error) {
    if (error) {
      errorMessages.push("Internal server error");
      const model = {
        errorMessages,
        email,
        url,
        description,
      };
      response.render("submit-page.hbs", model);
    }
    response.redirect("/submit-page");
  });
});

// GET blogposts

app.get("/blogposts-page", function (request, response) {
  const query = `SELECT * FROM blogposts  ORDER BY blogpostid DESC`;

  db.all(query, function (error, blogposts) {
    const errorMessages = [];

    if (error) {
      errorMessages.push("Internal server error");
    }
    const model = {
      errorMessages,
      blogposts,
    };

    response.render("blogposts-page.hbs", model);
  });
});

// POST blogposts

app.post("/blogposts-page", function (request, response) {
  const title = request.body.title;
  const category = request.body.category;
  const content = request.body.content;

  const errorMessages = [];

  if (title == "") {
    errorMessages.push("You didn't insert a title");
  } else if (blogpostTitleMaxLength < title.length) {
    errorMessages.push("Your blogpost title can't be longer than " + blogpostTitleMaxLength + " characters");
  }

  if (content == "") {
    errorMessages.push("You didn't insert any content");
  } else if (blogpostContentMaxLength < content.length) {
    errorMessages.push("Your description can't be longer than " + blogpostContentMaxLength + " characters");
  }

  if (errorMessages.length == 0) {
    const query = `INSERT INTO blogposts (title, category, content) VALUES (?, ?, ?)`;

    const values = [title, category, content];

    db.run(query, values, function (error) {
      if (error) {
        errorMessages.push("Internal server error");
        const model = {
          errorMessages,
          title,
          category,
          content,
        };
        response.render("blogposts-page.hbs", model);
      } else {
        response.redirect("/blogposts-page");
      }
    });
  } else {
    const query = `SELECT * FROM blogposts ORDER BY blogpostid DESC`;

    db.all(query, function (error, blogposts) {
      if (error) {
        errorMessages.push("Internal server error");
      }
      const model = {
        errorMessages,
        blogposts,
      };
      response.render("blogposts-page.hbs", model);
    });
  }
});

// DELETE blogpost

app.post("/delete-blogposts/:id", function (request, response) {
  const id = request.params.id;

  const query = `DELETE FROM blogposts WHERE blogpostid = ?`;

  const values = [id];

  db.run(query, values, function (error) {
    if (error) {
      errorMessages.push("Internal server error");
      const model = {
        title,
        category,
        content,
      };
      response.render("blogposts-page.hbs", model);
    }
    response.redirect("/blogposts-page");
  });
});

// GET edit blogpost

app.get("/edit-blogpost/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM blogposts WHERE blogpostid = ?`;

  const values = [id];

  db.get(query, values, function (error, blogpost) {
    if (error) {
      errorMessages.push("Internal server error");
    }
    const model = {
      blogpost,
    };

    response.render("edit-blogpost.hbs", model);
  });
});

// POST edit blogpost

app.post("/edit-blogpost/:id", function (request, response) {
  const id = request.params.id;

  const title = request.body.title;
  const category = request.body.category;
  const content = request.body.content;

  const errorMessages = [];

  if (!request.session.isLoggedIn) {
    errorMessages.push("You have to login to be able to edit a blogpost!");
  } else {
    if (title == "") {
      errorMessages.push("You didn't insert a title");
    } else if (blogpostTitleMaxLength < title.length) {
      errorMessages.push("Your blogpost title can't be longer than " + blogpostTitleMaxLength + " characters");
    }

    if (content == "") {
      errorMessages.push("You didn't insert any content");
    } else if (blogpostContentMaxLength < content.length) {
      errorMessages.push("Your description can't be longer than " + blogpostContentMaxLength + " characters");
    }
  }

  if (errorMessages.length == 0) {
    const query = `UPDATE blogposts SET
                title = ?,
                category = ?,
                content = ?
                WHERE blogpostid = ?`;

    const values = [title, category, content, id];

    db.run(query, values, function (error) {
      if (error) {
        errorMessages.push("Internal server error");
        const model = {
          errorMessages,
          blogpost: {
            blogpostid: id,
            title,
            category,
            content,
          },
        };
        response.render("edit-blogpost.hbs", model);
      } else {
        response.redirect("/blogposts-page");
      }
    });
  } else {
    const model = {
      errorMessages,
      blogpost: {
        blogpostid: id,
        title,
        category,
        content,
      },
    };

    response.render("edit-blogpost.hbs", model);
  }
});

// GET questions & answers

app.get("/q-and-a-page", function (request, response) {
  const query = `SELECT * FROM questions`;

  db.all(query, function (error, questions) {
    const query2 = "SELECT * FROM answers";

    db.all(query2, function (error, answers) {
      const errorMessages = [];

      if (error) {
        errorMessages.push("Internal server error");
      } else {
        for (const q of questions) {
          q.answers = answers.find((a) => q.questionid == a.questionid);
        }
      }
      const model = {
        errorMessages,
        questions,
        answers,
      };

      response.render("q-and-a-page.hbs", model);
    });
  });
});

// POST questions

app.post("/q-and-a-page", function (request, response) {
  const question = request.body.question;

  const errorMessages = [];

  if (question == "") {
    errorMessages.push("You didn't insert a question");
  } else if (questionMaxLength < question.length) {
    errorMessages.push("Your blogpost question can't be longer than " + questionMaxLength + " characters");
  }

  if (errorMessages.length == 0) {
    const query = `INSERT INTO questions (question) VALUES (?)`;

    const values = [question];

    db.run(query, values, function (error) {
      if (error) {
        errorMessages.push("Internal server error");
        const model = {
          errorMessages,
          question,
        };
        response.render("q-and-a-page.hbs", model);
      } else {
        response.redirect("/q-and-a-page");
      }
    });
  } else {
    const query = `SELECT * FROM questions`;

    db.all(query, function (error, questions) {
      const query2 = "SELECT * FROM answers";

      db.all(query2, function (error, answers) {
        if (error) {
          errorMessages.push("Internal server error");
        } else {
          for (const q of question) {
            q.answer = answers.find((a) => q.questionid == a.questionid);
          }
        }
        const model = {
          errorMessages,
          questions,
          answers,
        };
        response.render("q-and-a-page.hbs", model);
      });
    });
  }
});

// DELETE question & answer

app.post("/delete-questions/:id", function (request, response) {
  const id = request.params.id;

  const query = `DELETE FROM questions WHERE questionid = ?`;

  const values = [id];

  db.run(query, values, function (error) {
    const query2 = `DELETE FROM answers WHERE questionid = ?`;

    db.run(query2, values, function (error) {
      if (error) {
        errorMessages.push("Internal server error");
        const model = {
          errorMessages,
          answer,
          question,
        };
        response.render("q-and-a-page.hbs", model);
      }
    });

    response.redirect("/q-and-a-page");
  });
});

// GET add answer

app.get("/add-answer/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM questions WHERE questionid = ?`;

  const values = [id];

  db.get(query, values, function (error, question) {
    if (error) {
      errorMessages.push("Internal server error");
    }
    const model = {
      question,
    };

    response.render("add-answer.hbs", model);
  });
});

// POST add answer

app.post("/add-answer/:id", function (request, response) {
  const id = request.params.id;

  const answer = request.body.answer;

  const errorMessages = [];

  if (!request.session.isLoggedIn) {
    errorMessages.push("You have to login to be able to add an answer!");
  } else {
    if (answer == "") {
      errorMessages.push("You didn't insert an answer");
    } else if (answerMaxLength < answer.length) {
      errorMessages.push("Your answer can't be longer than " + answerMaxLength + " characters");
    }
  }

  if (errorMessages.length == 0) {
    const query = `INSERT INTO answers (answer, questionid) VALUES (?, ?)`;

    const values = [answer, id];

    db.run(query, values, function (error) {
      if (error) {
        errorMessages.push("Internal server error");
        const model = {
          errorMessages,
          answer: {
            questionid: id,
            answer,
          },
        };
        response.render("add-answer.hbs", model);
      } else {
        response.redirect("/q-and-a-page");
      }
    });
  } else {
    const id = request.params.id;

    const query = `SELECT * FROM questions WHERE questionid = ?`;

    const values = [id];

    db.get(query, values, function (error, question) {
      if (error) {
        errorMessages.push("Internal server error");
      }
      const model = {
        errorMessages,
        question,
      };

      response.render("add-answer.hbs", model);
    });
  }
});

// GET edit answer

app.get("/edit-answer/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM answers WHERE answerid = ?`;

  const values = [id];

  db.get(query, values, function (error, answer) {
    if (error) {
      errorMessages.push("Internal server error");
    }
    const model = {
      answer,
    };

    response.render("edit-answer.hbs", model);
  });
});

// POST edit answer

app.post("/edit-answer/:id", function (request, response) {
  const id = request.params.id;

  const answer = request.body.answer;

  const errorMessages = [];

  if (!request.session.isLoggedIn) {
    errorMessages.push("You have to login to be able to edit an answer!");
  } else {
    if (answer == "") {
      errorMessages.push("You didn't insert an answer");
    } else if (answerMaxLength < answer.length) {
      errorMessages.push("Your answer can't be longer than " + answerMaxLength + " characters");
    }
  }

  if (errorMessages.length == 0) {
    const query = `UPDATE answers SET answer = ? WHERE answerid = ?`;

    const values = [answer, id];

    db.run(query, values, function (error) {
      if (error) {
        errorMessages.push("Internal server error");
        const model = {
          errorMessages,
          answer: {
            answerid: id,
            answer,
          },
        };
        response.render("edit-answer.hbs", model);
      } else {
        response.redirect("/q-and-a-page");
      }
    });
  } else {
    const model = {
      errorMessages,
      answer: {
        answerid: id,
        answer,
      },
    };

    response.render("edit-answer.hbs", model);
  }
});

// GET contact page

app.get("/contact-page", function (request, response) {
  response.render("contact-page.hbs");
});

// GET about page

app.get("/about-page", function (request, response) {
  response.render("about-page.hbs");
});

// GET login page

app.get("/login-page", function (request, response) {
  response.render("login-page.hbs");
});

// GET login page

app.post("/login-page", function (request, response) {
  const enteredUsername = request.body.username;
  const enteredPassword = request.body.password;

  const verifiedPassword = bcrypt.compareSync(enteredPassword, hash);

  if (enteredUsername == adminUsername && verifiedPassword) {
    // Successfully logged in
    request.session.isLoggedIn = true;

    response.redirect("/");
  } else {
    // Failed to login
    const model = {
      failedToLogin: true,
    };
    response.render("login-page.hbs", model);
  }
});

app.post("/logout", function (request, response) {
  request.session.isLoggedIn = false;

  response.redirect("/");
});

app.listen(8080);
