const { ApolloServer, gql } = require("apollo-server");
const typeDefs = require("./db/schema");
const resolvers = require("./db/resolvers");
const conectarDB = require("./config/db");
const jwt = require('jsonwebtoken');
require("dotenv").config({ path: "variables.env" });
 

//CONECTAR DB
conectarDB(); 
//servidor
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context : ({req}) => {
    // console.log(req.headers['authorization']);
    const token = req.headers['authorization'] || '';
    console.log(req.headers);

    if(token){
      try {
        const usuario = jwt.verify(token.replace('Bearer ', ''), process.env.SECRETO);
        console.log(usuario);


        return {
          usuario
        }
        
      } catch (error) {

        console.log(error);
        
      }
    }
  }
  
});

//arrancar server
server.listen({port: process.env.PORT || 4000}).then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
