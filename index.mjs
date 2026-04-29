import express from 'express';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import session from 'express-session';
import bcrypt from 'bcrypt';

dotenv.config();
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
//for Express to get values using the POST method
app.use(express.urlencoded({extended:true}));

app.use(session({
    secret: process.env.SESSION_SECRET || 'please-change-this-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 // 1 hour
    }
}));

function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId != null) {
        return next();
    }
    res.redirect('/login');
}

//setting up database connection pool, replace values in red
const pool = mysql.createPool({
    host: process.env.DB_HOST, // host name will be contained in the .env file, but you can also just put it here
    user: process.env.DB_USERNAME, // user name will be contained in the .env file, but you can also just put it here
    password: process.env.DB_PWD, // process.env.XYZ specifically means to get the value of XYZ from the .env file, but you can also just put it here
    database: process.env.DB_NAME, // while the database name is not sensitive information, we can also put it in the .env file for consistency
    connectionLimit: 10,
    waitForConnections: true
});
//routes
app.get('/', async (req, res) => {
    let sql = `SELECT authorId, firstName, lastName
               FROM authors
               ORDER by lastName`;
    const [authors] = await pool.query(sql);
    
    // Fetch categories for the category dropdown
    const [categories] = await pool.query(`SELECT DISTINCT category FROM quotes ORDER BY category`);
    
   res.render('home', { authors, categories });
});

app.get('/login', async (req, res) => {
    if (req.session && req.session.userId != null) {
        return res.redirect('/admin');
    }
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    try {
        const username = req.body.username?.trim();
        const password = req.body.password;

        if (!username || !password) {
            return res.render('login', { error: 'Username and password are required.' });
        }

        const [rows] = await pool.query('SELECT adminId, username, password FROM admin WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.render('login', { error: 'Invalid username or password.' });
        }

        const admin = rows[0];
        const passwordMatch = await bcrypt.compare(password, admin.password);
        if (!passwordMatch) {
            return res.render('login', { error: 'Invalid username or password.' });
        }

        req.session.userId = admin.adminId;
        req.session.username = admin.username;
        res.redirect('/admin');
    } catch (err) {
        console.error('Login error:', err);
        res.render('login', { error: 'Login failed. Please try again.' });
    }
});

app.get('/admin', isAuthenticated, async (req, res) => {
    res.render('admin', { username: req.session.username });
});

app.get('/profile', isAuthenticated, async (req, res) => {
    res.render('profile', { username: req.session.username });
});

app.get('/settings', isAuthenticated, async (req, res) => {
    res.render('settings', { username: req.session.username });
});

// Author CRUD
app.get('/admin/authors', isAuthenticated, async (req, res) => {
    const [authors] = await pool.query('SELECT * FROM authors ORDER BY lastName');
    res.render('admin-authors', { authors, username: req.session.username, error: null });
});

app.get('/admin/authors/new', isAuthenticated, (req, res) => {
    res.render('admin-author-form', { author: null, username: req.session.username });
});

app.post('/admin/authors/new', isAuthenticated, async (req, res) => {
    const { firstName, lastName, dob, dod, sex, profession, country, portrait, biography } = req.body;
    await pool.query('INSERT INTO authors (firstName, lastName, dob, dod, sex, profession, country, portrait, biography) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [firstName, lastName, dob, dod, sex, profession, country, portrait, biography]);
    res.redirect('/admin/authors');
});

app.get('/admin/authors/edit', isAuthenticated, async (req, res) => {
    const { id } = req.query;
    if (!id) return res.redirect('/admin/authors');
    const [authors] = await pool.query('SELECT * FROM authors WHERE authorId = ?', [id]);
    res.render('admin-author-form', { author: authors[0], username: req.session.username });
});

app.post('/admin/authors/edit', isAuthenticated, async (req, res) => {
    const { id, firstName, lastName, dob, dod, sex, profession, country, portrait, biography } = req.body;
    await pool.query('UPDATE authors SET firstName = ?, lastName = ?, dob = ?, dod = ?, sex = ?, profession = ?, country = ?, portrait = ?, biography = ? WHERE authorId = ?', [firstName, lastName, dob, dod, sex, profession, country, portrait, biography, id]);
    res.redirect('/admin/authors');
});

app.post('/admin/authors/delete', isAuthenticated, async (req, res) => {
    const { id } = req.body;
    const [quotes] = await pool.query('SELECT COUNT(*) as count FROM quotes WHERE authorId = ?', [id]);
    if (quotes[0].count > 0) {
        const [authors] = await pool.query('SELECT * FROM authors ORDER BY lastName');
        res.render('admin-authors', { authors, username: req.session.username, error: 'Cannot delete author with existing quotes.' });
    } else {
        await pool.query('DELETE FROM authors WHERE authorId = ?', [id]);
        res.redirect('/admin/authors');
    }
});

// Quote CRUD
app.get('/admin/quotes', isAuthenticated, async (req, res) => {
    const [quotes] = await pool.query('SELECT q.*, a.firstName, a.lastName FROM quotes q JOIN authors a ON q.authorId = a.authorId ORDER BY q.quote');
    res.render('admin-quotes', { quotes, username: req.session.username });
});

app.get('/admin/quotes/new', isAuthenticated, async (req, res) => {
    const [authors] = await pool.query('SELECT authorId, firstName, lastName FROM authors ORDER BY lastName');
    res.render('admin-quote-form', { quote: null, authors, username: req.session.username });
});

app.post('/admin/quotes/new', isAuthenticated, async (req, res) => {
    const { quote, authorId, category, likes } = req.body;
    await pool.query('INSERT INTO quotes (quote, authorId, category, likes) VALUES (?, ?, ?, ?)', [quote, authorId, category, likes]);
    res.redirect('/admin/quotes');
});

app.get('/admin/quotes/edit', isAuthenticated, async (req, res) => {
    const { id } = req.query;
    if (!id) return res.redirect('/admin/quotes');
    const [quotes] = await pool.query('SELECT * FROM quotes WHERE quoteId = ?', [id]);
    const [authors] = await pool.query('SELECT authorId, firstName, lastName FROM authors ORDER BY lastName');
    res.render('admin-quote-form', { quote: quotes[0], authors, username: req.session.username });
});

app.post('/admin/quotes/edit', isAuthenticated, async (req, res) => {
    const { id, quote, authorId, category, likes } = req.body;
    await pool.query('UPDATE quotes SET quote = ?, authorId = ?, category = ?, likes = ? WHERE quoteId = ?', [quote, authorId, category, likes, id]);
    res.redirect('/admin/quotes');
});

app.post('/admin/quotes/delete', isAuthenticated, async (req, res) => {
    const { id } = req.body;
    await pool.query('DELETE FROM quotes WHERE quoteId = ?', [id]);
    res.redirect('/admin/quotes');
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// IMPORTANT: Always use parameterized queries when using user input in SQL statements to prevent SQL injection attacks. NEVER directly concatenate user input into SQL strings.
//API to get the author information based on an author ID, this will be used by the AJAX call in the home.ejs file
app.get('/api/author/:authorID', async(req, res) => { //
   try {
        let authorID = req.params.authorID; //note that param has to match the :authorID in the route
        let sql = `SELECT *
                  FROM authors
                  WHERE authorId = ?`;
        
        const [authorInfo] = await pool.query(sql, [authorID]);
        if (authorInfo.length === 0) {
            res.status(404).send({ error: "Author not found" });
        } else {
            res.json(authorInfo[0]); //send the author information back to the AJAX call as a response
        }
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send({ error: "Database error!" });
    }
});
//Searching quotes by author
app.get("/searchByAuthor", async(req, res) => {
   try {
        let authorID = req.query.authorID;
        let sql = `SELECT quote, firstName, lastName, authorId
                   FROM quotes
                   NATURAL JOIN authors
                   WHERE authorId = ? `;
        let sqlParams = [authorID];
        const [rows] = await pool.query(sql, sqlParams);
        
        // Also fetch authors for the dropdown
        const [authors] = await pool.query(`SELECT authorId, firstName, lastName FROM authors ORDER BY lastName`);
        
        res.render('quotes', { rows, authors });

    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});
//Searching quotes by keyword
//NEVER have user input within the SQL statement!!
app.get("/searchByKeyword", async(req, res) => {
   try {
        //console.log(req);
        let keyword = req.query.keyword;
        let sql = `SELECT quote, firstName, lastName, authorId
                   FROM quotes
                   NATURAL JOIN authors
                   WHERE quote LIKE ? `;
        let sqlParams = [`%${keyword}%`];
        const [rows] = await pool.query(sql, sqlParams);
        
        // Also fetch authors for the dropdown
        const [authors] = await pool.query(`SELECT authorId, firstName, lastName FROM authors ORDER BY lastName`);
        
        //since we have quotes.ejs, we can render that and pass the rows to it
        res.render('quotes', { rows, authors });

    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});//dbTest


app.get("/dbTest", async(req, res) => {
   try {
        const [rows] = await pool.query("SELECT CURDATE()");
        res.send(rows);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }


});//dbTest

// Search by Category
app.get("/searchByCategory", async(req, res) => {
   try {
        let category = req.query.category;
        let sql = `SELECT quote, firstName, lastName, authorId
                   FROM quotes
                   NATURAL JOIN authors
                   WHERE category = ?
                   ORDER BY quote`;
        let sqlParams = [category];
        const [rows] = await pool.query(sql, sqlParams);
        
        // Also fetch authors for the dropdown
        const [authors] = await pool.query(`SELECT authorId, firstName, lastName FROM authors ORDER BY lastName`);
        
        res.render('quotes', { rows, authors });

    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});

// Search by Likes
app.get("/searchByLikes", async(req, res) => {
   try {
        let minLikes = parseInt(req.query.minLikes) || 0;
        let maxLikes = parseInt(req.query.maxLikes) || 999999;
        
        // Swap if min > max
        if (minLikes > maxLikes) {
            [minLikes, maxLikes] = [maxLikes, minLikes];
        }
        
        let sql = `SELECT quote, firstName, lastName, authorId, likes
                   FROM quotes
                   NATURAL JOIN authors
                   WHERE likes BETWEEN ? AND ?
                   ORDER BY likes DESC, quote`;
        let sqlParams = [minLikes, maxLikes];
        const [rows] = await pool.query(sql, sqlParams);
        
        // Also fetch authors for the dropdown
        const [authors] = await pool.query(`SELECT authorId, firstName, lastName FROM authors ORDER BY lastName`);
        
        res.render('quotes', { rows, authors });

    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});
// we will fix this route to process.envPort now

app.listen(process.env.PORT || 3001, ()=>{
    console.log("Express server running")
})

