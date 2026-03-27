import express from 'express';
import mysql from 'mysql2/promise';
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
//for Express to get values using the POST method
app.use(express.urlencoded({extended:true}));
//setting up database connection pool, replace values in red
const pool = mysql.createPool({
    host: "sh4ob67ph9l80v61.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "w9c7lwn8um1o99yj",
    password: "u3rw8lbcasz2h307",
    database: "pyn5h5u7iu857dd2",
    connectionLimit: 10,
    waitForConnections: true
});
//routes
app.get('/', async (req, res) => {
    let sql = `SELECT authorID, firstName, lastName
               FROM authors
               ORDER by lastName`;
    const [authors] = await pool.query(sql);
    
    // Fetch categories for the category dropdown
    const [categories] = await pool.query(`SELECT DISTINCT category FROM quotes ORDER BY category`);
    
   res.render('home', { authors, categories });
});
//Searching quotes by author
app.get("/searchByAuthor", async(req, res) => {
   try {
        let authorID = req.query.authorID;
        let sql = `SELECT quote, firstName, lastName
                   FROM quotes
                   NATURAL JOIN authors
                   WHERE authorID = ? `;
        let sqlParams = [authorID];
        const [rows] = await pool.query(sql, sqlParams);
        
        // Also fetch authors for the dropdown
        const [authors] = await pool.query(`SELECT authorID, firstName, lastName FROM authors ORDER BY lastName`);
        
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
        let sql = `SELECT quote, firstName, lastName
                   FROM quotes
                   NATURAL JOIN authors
                   WHERE quote LIKE ? `;
        let sqlParams = [`%${keyword}%`];
        const [rows] = await pool.query(sql, sqlParams);
        
        // Also fetch authors for the dropdown
        const [authors] = await pool.query(`SELECT authorID, firstName, lastName FROM authors ORDER BY lastName`);
        
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
        let sql = `SELECT quote, firstName, lastName
                   FROM quotes
                   NATURAL JOIN authors
                   WHERE category = ?
                   ORDER BY quote`;
        let sqlParams = [category];
        const [rows] = await pool.query(sql, sqlParams);
        
        // Also fetch authors for the dropdown
        const [authors] = await pool.query(`SELECT authorID, firstName, lastName FROM authors ORDER BY lastName`);
        
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
        
        let sql = `SELECT quote, firstName, lastName, likes
                   FROM quotes
                   NATURAL JOIN authors
                   WHERE likes BETWEEN ? AND ?
                   ORDER BY likes DESC, quote`;
        let sqlParams = [minLikes, maxLikes];
        const [rows] = await pool.query(sql, sqlParams);
        
        // Also fetch authors for the dropdown
        const [authors] = await pool.query(`SELECT authorID, firstName, lastName FROM authors ORDER BY lastName`);
        
        res.render('quotes', { rows, authors });

    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});

app.listen(3001, ()=>{
    console.log("Express server running")
})