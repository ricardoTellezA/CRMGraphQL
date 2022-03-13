const Usuario = require("../models/Usuario");
const Cliente = require("../models/Cliente");
const Producto = require("../models/Producto");
const Pedido = require("../models/Pedido");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "variables.env" });

const crearToken = (usuario, secreta, expiresIn) => {
  const { id, email, nombre, apellido } = usuario;

  return jwt.sign({ id, email, nombre, apellido }, secreta, { expiresIn });
};

const resolvers = {
  Query: {
    obtenerUsuario: async (_, {}, ctx) => {
     return ctx.usuario;
    },

    obtenerProductos: async () => {
      try {
        const productos = await Producto.find({});
        return productos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerProducto: async (_, { id }) => {
      //REVISAR SI EL PRODUCTO EXISTE
      const producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("Producto no encontrado");
      }
      return producto;
    },

    obtenerClientes: async () => {
      try {
        const clientes = await Cliente.find({});
        return clientes;
      } catch (error) {
        console.log(error);
      }
    },

    obtnerClientesVendedor: async (_, {}, ctx) => {
      try {
        const clientes = await Cliente.find({
          vendedor: ctx.usuario.id.toString(),
        });
        return clientes;
      } catch (error) {
        console.log(error);
      }
    },

    obtenerCliente: async (_, { id }, ctx) => {
      //revisar si el cliente existe
      const cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("Cliente no encontrado");
      }

      //Quien lo creo puede verlo
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      return cliente;
    },

    obtenerPedidos: async () => {
      try {
        const pedidos = await Pedido.find({});
        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerPedidosVendedor: async (_, {}, ctx) => {
      try {
        const pedidos = await Pedido.find({ vendedor: ctx.usuario.id }).populate('cliente');
        
        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },

    obtenerPedido: async (_, { id }, ctx) => {
      //VERIFICAR SI EL PEDIDO EXISTE

      const pedido = await Pedido.findById(id);
      if (!pedido) {
        throw new Error("Pedido no encontrado");
      }

      //solamente el que lo creo puede verlo

      if (pedido.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      //RETORNAR RESULTADO
      return pedido;
    },

    obtenerPedidosEstado: async (_, { estado }, ctx) => {
      const pedidos = await Pedido.find({ vendedor: ctx.usuario.id, estado });
      return pedidos;
    },

    mejoresClientes: async () => {
      const clientes = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        {
          $group: {
            _id: "$cliente",
            total: { $sum: "$total" },
          },
        },

        {
          $lookup: {
            from: "clientes",
            localField: "_id",
            foreignField: "_id",
            as: "cliente",
          },
        },

        {
          $limit: 3,
        },

        {
          $sort: { total: -1 },
        },
      ]);
      return clientes;
    },

    mejoresVendedores: async () => {
      const vendedores = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        {
          $group: {
            _id: "$vendedor",
            total: { $sum: "$total" },
          },
        },
        {
          $lookup: {
            from: "usuarios",
            localField: "_id",
            foreignField: "_id",
            as: "vendedor",
          },
        },

        {
          $limit: 3,
        },
        {
          $sort: { total: -1 },
        },
      ]);
      return vendedores
    },

    buscarProducto: async(_,{texto} ) => {
      const productos = await Producto.find({$text: {$search: texto}}).limit(10);
      return productos;
    }
  },

  Mutation: {
    nuevoUsuario: async (_, { input }) => {
      //REVISAR SI EL USUARIO YA EXISTE
      const { email, password } = input;
      const existeUsuario = await Usuario.findOne({ email });

      if (existeUsuario) {
        throw new Error("El usuario ya existe");
      }

      //HACHEAR EL PASSWORD
      const salt = await bcryptjs.genSalt(10);
      input.password = await bcryptjs.hash(password, salt);

      //GUARDAR EL USUARIO EN LA BASE DE DATOS

      try {
        const usuario = new Usuario(input);
        usuario.save();
        return usuario;
      } catch (error) {
        console.log(error);
      }
    },
    //Autenticar Usuario
    autenticarUsuario: async (_, { input }) => {
      //REVISAR SI EL USUARIO EXISTE

      const { email, password } = input;
      const usuario = await Usuario.findOne({ email });

      if (!usuario) {
        throw new Error("El usuario no existe");
      }

      //REVISAR EL PASSWORD

      const passwordCorrecto = await bcryptjs.compare(
        password,
        usuario.password
      );

      if (!passwordCorrecto) {
        throw new Error("El password es incorrecto");
      }

      //CREAR EL TOKEN
      return {
        token: crearToken(usuario, process.env.SECRETO, "24h"),
      };
    },
    //Nuevo Producto
    nuevoProducto: async (_, { input }) => {
      try {
        const producto = new Producto(input);
        //almacenar en la base de datos
        const resultado = await producto.save();
        return resultado;
      } catch (error) {
        console.log(error);
      }
    },

    //Actualizar Producto
    actualizarProducto: async (_, { id, input }) => {
      //REVISAR SI EL PRODUCTO EXISTE
      let producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("Producto no encontrado");
      }

      //GUARDAR EN LA BASE DE DATOS

      producto = await Producto.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });
      return producto;
    },

    //Eliminar Producto
    eliminarProducto: async (_, { id }) => {
      //REVISAR SI EL PRODUCTO EXISTE
      let producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("Producto no encontrado");
      }

      await Producto.findOneAndDelete({ _id: id });
      return "Producto Eliminado";
    },

    //agregar nuevo cliente
    nuevoCliente: async (_, { input }, ctx) => {
      console.log(ctx);
      const { email } = input;
      //VERIFICAR SI EL CLIENTE YA EXISTE

      const cliente = await Cliente.findOne({ email: email });

      if (cliente) {
        throw new Error("El cliente ya existe");
      }

      //ASIGNAR AL VENDEDOR
      const nuevoCliente = new Cliente(input);
      nuevoCliente.vendedor = ctx.usuario.id;
      console.log("AQUI!!!", nuevoCliente);
      //GUARDAR EL CLIENTE EN LA BASE DE DATOS

      try {
        const resultado = await nuevoCliente.save();
        return resultado;
      } catch (error) {
        console.log(error);
      }
    },

    actualizarCliente: async (_, { id, input }, ctx) => {
      //VERIFICAR SI EXISTE EL CLIENTE
      let cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("Cliente no encontrado");
      }

      //verificar si el vendedor es el que edita
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      //guardar cliente
      cliente = await Cliente.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });
      return cliente;
    },

    eliminarCliente: async (_, { id }, ctx) => {
      let cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("Cliente no encontrado");
      }

      //verificar si el vendedor es el que edita
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      //eliminar cliente
      await Cliente.findOneAndDelete({ _id: id });
      return "Se elimino el cliente";
    },

    nuevoPedido: async (_, { input }, ctx) => {
      //VERIFICAR SI CLIENTE EXISTE
      const { cliente } = input;
      const existeCliente = await Cliente.findById(cliente);

      if (!existeCliente) {
        throw new Error("Cliente no encontrado");
      }

      //VERIFICAR SI EL CLIENTE ES DEL VENDEDOR

      if (existeCliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      //REVISAR QUE EL STOCK SEA SUFICIENTE
      for await (const articulo of input.pedido) {
        const { id } = articulo;
        const producto = await Producto.findById(id);

        if (articulo.cantidad > producto.existencia) {
          throw new Error(
            `El producto ${producto.nombre} no tiene stock suficiente`
          );
        } else {
          //RESTAR EL STOCK
          producto.existencia = producto.existencia - articulo.cantidad;
          await producto.save();
        }
      }

      //CREAR EL PEDIDO
      const nuevoPedido = new Pedido(input);
      //asignar el vendedor
      nuevoPedido.vendedor = ctx.usuario.id;

      //GUARDAR EL PEDIDO
      const resultado = await nuevoPedido.save();
      return resultado;
    },

    actualizarPedido: async (_, { id, input }, ctx) => {
      const { cliente } = input;
      //VERIFICAR SI EL PEDIDO EXISTE
      const existePedido = await Pedido.findById(id);
      if (!existePedido) {
        throw new Error("Pedido no encontrado");
      }
      //VERIFICAR SI EL CLIENTE EXISTE
      const existeCliente = await Cliente.findById(cliente);
      if (!existeCliente) {
        throw new Error("Cliente no encontrado");
      }

      //VERIFICAR SI EL CLIENTE ES DEL VENDEDOR

      if (existeCliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      //REVISAR QUE EL STOCK SEA SUFICIENTE
      if (input.pedido) {
        for await (const articulo of input.pedido) {
          const { id } = articulo;
          const producto = await Producto.findById(id);

          if (articulo.cantidad > producto.existencia) {
            throw new Error(
              `El producto ${producto.nombre} no tiene stock suficiente`
            );
          } else {
            //RESTAR EL STOCK
            producto.existencia = producto.existencia - articulo.cantidad;
            await producto.save();
          }
        }
      }

      //GUARDAR EL PEDIDO
      const resultado = await Pedido.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });
      return resultado;
    },
    eliminarPedido: async (_, { id }, ctx) => {
      //VERIFICAR SI EL PEDIDO EXISTE
      const existePedido = await Pedido.findById(id);
      if (!existePedido) {
        throw new Error("Pedido no encontrado");
      }

      //VERIFICAR SI EL CLIENTE EXISTE
      if (existePedido.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      //ELIMINAR EL PEDIDO
      await Pedido.findOneAndDelete({ _id: id });
      return "Se elimino el pedido";
    },
  },
};

module.exports = resolvers;
