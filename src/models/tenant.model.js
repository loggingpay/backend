const pool = require("../../db/conn");
const { nanoid } = require("nanoid");
const slug = require('slug').default;

const createTenant = async (name) => {
    const id = nanoid(7);
    const searchTenant = "SELECT name FROM tenants WHERE name=$1";
    const searchResult = await pool.query(searchTenant, [name]);
    if (searchResult.length > 0) {
        return "Tenant already exists with that name!"
    }
    const slugName = slug(name.split(" ").slice(0, 2).join("-"));
    const createQuery = "INSERT INTO tenants(id, name, slug)VALUES($1,$2,$3) RETURNING id, slug";
    const result = await pool.query(createQuery, [id, name, slugName])
    return result.rows[0]
}


module.exports = { createTenant }