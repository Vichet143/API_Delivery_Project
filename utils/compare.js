const bcrypt = require("bcrypt")

exports.comparePassword = async (email, ) => {
  return await bcrypt.compare(email, hash)
}