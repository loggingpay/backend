const { createUser } = require("../models/users.model");

const createUserController = async (req, res) => {
    try {
        const {
            f_name,
            l_name,
            email,
            password,
            tenantid,
            created_by
        } = req.body;
        if (!f_name || !l_name || !email || !password || !tenantid) {
            return res.status(400).json({
                message: "All fields are required"
            })
        }
        const user = await createUser(
            f_name,
            l_name,
            email,
            password,
            tenantid,
            created_by || null
        )
        if (typeof user === "string") {
            return res.status(400).json({
                message: user,
            });
        }

        return res.status(201).json({
            message: "User created successfully",
            user_id: user.id
        })
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({
            message: "Internal Server Error",
            error: err
        });
    }
}


module.exports = { createUserController }
