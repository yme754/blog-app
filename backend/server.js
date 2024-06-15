const exp = require("express");
const app = exp();
const cors = require('cors');
const mongoose = require('mongoose');

app.use(cors());
app.use(exp.json());

const db = "mongodb://127.0.0.1:27017/blog";
mongoose.connect(db).then(() => {
    console.log("DB connected");
}).catch((err) => {
    console.error("DB not connected", err);
});

const userSchema = new mongoose.Schema({
    Name: String,
    email: String,
    password: String,
    confirmpassword: String,
    phone: String
});

const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    email: String,
    isDraft: { type: Boolean, default: false },
    comment: [{ type: String }]
});

const userdatabase = mongoose.model("users", userSchema);

const postdatabase = mongoose.model("posts", postSchema);

app.post('/register', async (req, res) => {
    const { Name, email, password, confirmPassword, phone } = req.body;
    try {
        const user = await userdatabase.findOne({ email: email });
        if (user) {
            res.send({ message: "User already exists", status: false });
        } else {
            const newUser = new userdatabase({ Name, email, password, confirmpassword: confirmPassword, phone });
            await newUser.save();
            res.send({ message: "Successfully Registered", status: true });
        }
    } catch (err) {
        console.error("Registration error", err);
        res.status(500).send({ message: "Internal server error", status: false });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await userdatabase.findOne({ email: email });
        if (user) {
            if (password === user.password) {
                res.send({
                    message: "Login Successful",
                    status: true,
                    user: user.Name,
                    email: user.email,
                    phone: user.phone
                });
            } else {
                res.send({ message: "Invalid credentials", status: false });
            }
        } else {
            res.send({ message: "Invalid credentials", status: false });
        }
    } catch (err) {
        console.error("Login error", err);
        res.status(500).send({ message: "Internal server error", status: false });
    }
});

app.post('/post', async (req, res) => {
    const { title, content, email } = req.body;
    try {
        const newPost = new postdatabase({ title, content, email, isDraft: false });
        await newPost.save();
        res.send({ message: "Successfully posted", status: true });
    } catch (err) {
        console.error("Post error", err);
        res.status(500).send({ message: "Internal server error", status: false });
    }
});

app.post('/saveDraft', async (req, res) => {
    const { title, content, email } = req.body;
    try {
        const draft = await postdatabase.findOneAndUpdate(
            { email, isDraft: true },
            { title, content, email, isDraft: true },
            { upsert: true, new: true }
        );
        res.send({ message: "Draft saved successfully", status: true });
    } catch (err) {
        console.error("Save draft error", err);
        res.status(500).send({ message: "Internal server error", status: false });
    }
});

app.get('/getDraft', async (req, res) => {
    const { email } = req.query;
    try {
        const draft = await postdatabase.findOne({ email, isDraft: true });
        if (draft) {
            res.send({ draft, status: true });
        } else {
            res.send({ message: "No draft found", status: false });
        }
    } catch (err) {
        console.error("Get draft error", err);
        res.status(500).send({ message: "Internal server error", status: false });
    }
});

app.get('/articles', async (req, res) => {
    try {
        const articles = await postdatabase.find({ isDraft: false });
        res.send({ articles: articles || [], status: true });
    } catch (err) {
        console.error("Fetch articles error", err);
        res.status(500).send({ message: "Internal server error", status: false });
    }
});

app.get('/myarticles', async (req, res) => {
    const userEmail = req.query.email;
    try {
        const articles = await postdatabase.find({ email: userEmail, isDraft: false });
        res.send({ data: articles, status: true });
    } catch (err) {
        console.error("Fetch user articles error", err);
        res.status(500).send({ message: "Internal server error", status: false });
    }
});

app.get('/article/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const article = await postdatabase.findById(id);
        res.send({ article, status: true });
    } catch (err) {
        console.error("Fetch article error", err);
        res.status(500).send({ message: "Internal server error", status: false });
    }
});

app.delete('/article/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await postdatabase.findByIdAndDelete(id);
        res.send({ message: "Article deleted successfully", status: true });
    } catch (err) {
        console.error("Delete article error", err);
        res.status(500).send({ message: "Internal server error", status: false });
    }
});

app.post('/article/:id/comment', async (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;
    try {
        const article = await postdatabase.findById(id);
        if (!article) {
            return res.status(404).send({ message: "Article not found", status: false });
        }
        // Add the comment to the article's comments array
        article.comment.push(comment);
        await article.save();
        res.send({ message: "Comment posted successfully", status: true, comment });
    } catch (err) {
        console.error("Post comment error", err);
        res.status(500).send({ message: "Internal server error", status: false });
    }
});

app.post("/profile", async (req, res) => {
    const { userEmail } = req.body;
    try {
        const userDetails = await userdatabase.findOne({ email: userEmail });
        const totalBookings = await postdatabase.find({ email: userEmail }).count();
        const totalPostings = await postdatabase.find({ email: userEmail }).count();
        const user = { userDetails, totalBookings, totalPostings };
        res.send({ status: true, message: 'User fetched successfully', data: user });
    } catch (err) {
        console.error("Profile fetch error", err);
        res.status(500).send({ message: "Internal server error", status: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
