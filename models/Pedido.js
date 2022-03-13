const moongose = require("mongoose");

const PedidoShema = new moongose.Schema({
  pedido: {
    type: Array,
    required: true,
  },

  total: {
    type: Number,
    required: true,
  },

  cliente: {
    type: moongose.Schema.Types.ObjectId,
    required: true,
    ref: "Cliente",
  },

  vendedor: {
    type: moongose.Schema.Types.ObjectId,
    required: true,
    ref: "Vendedor",
  },
  estado:{
      type: String,
      default: "PENDIENTE",
  },
  creado:{
      type: Date,
      default: Date.now()
  }
});

module.exports = moongose.model("Pedido", PedidoShema);
