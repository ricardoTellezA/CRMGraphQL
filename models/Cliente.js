const moongose = require("mongoose");

const ClienteShema = new moongose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
  },

  apellido: {
    type: String,
    required: true,
    trim: true,
  },

  empresa: {
    type: String,
    required: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },

  telefono: {
    type: String,
    trim: true,
  },

  creado: {
    type: Date,
    default: Date.now, 
  },

  vendedor: {
    type: moongose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: true,
  },
});

module.exports = moongose.model("Cliente", ClienteShema);
