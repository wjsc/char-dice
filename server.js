var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.use(express.static(__dirname + '/public'));
var mesas = [];
var id_jugador = 0;
// Enviar cuadriculas a cliente
var cuadriculas = 8;
io.on('connection', function(socket) {
    socket.on('req_buscar_mesa', function(nombre) {
        if (false) {
            socket.emit('no_hay_mesas');
        } else {
            id_jugador++;
            var primera_mesa_abierta = buscar_primera_mesa_abierta();
            var jugador = {};
            jugador.id = id_jugador;
            jugador.nombre = nombre;
            jugador.estoy_listo = false;
            jugador.puntos = 0;
            sentar_jugador_en_una_mesa(primera_mesa_abierta, jugador);
            socket.jugador = jugador;
            socket.join('mesa_' + primera_mesa_abierta);
            socket.emit('tu_id', jugador.id);
            io.to('mesa_' + primera_mesa_abierta).emit('res_buscar_mesa', mesas[primera_mesa_abierta].jugadores);
        }
    });
    socket.on('req_estoy_listo', function(valor) {
        var mesa_de_jugador = obtener_mesa_de_jugador(socket.jugador);
        socket.jugador.estoy_listo = valor;
        socket.emit('res_estoy_listo');
        if (la_mesa_esta_cerrada(mesa_de_jugador)) {
            var posicion = sortear_turno(mesa_de_jugador);
            io.to('mesa_' + mesa_de_jugador).emit('turno', mesas[mesa_de_jugador].jugadores[posicion]);
        }
    })
    socket.on('req_rodar_dados', function() {
        var mesa_de_jugador = obtener_mesa_de_jugador(socket.jugador);
        io.to('mesa_' + mesa_de_jugador).emit('res_rodar_dados', rodar_dados());
    });
    socket.on('req_agregar_dado', function(obj) {
        var mesa_de_jugador = obtener_mesa_de_jugador(socket.jugador);
        io.to('mesa_' + mesa_de_jugador).emit('res_agregar_dado', obj);
    });
    socket.on('req_sumar_tablero', function(tablero) {
        var mesa_de_jugador = obtener_mesa_de_jugador(socket.jugador);
        // Falta validar la jugada
        // console.log(tablero);
        socket.jugador.puntos += sumar_tablero(tablero);
        io.to('mesa_' + mesa_de_jugador).emit('res_sumar_tablero', mesas[mesa_de_jugador].jugadores);
        var posicion = turno_siguiente(mesa_de_jugador, socket.jugador.id);
        io.to('mesa_' + mesa_de_jugador).emit('turno', mesas[mesa_de_jugador].jugadores[posicion]);
    });
});
server.listen(3000, function() {
    // console.log(mesas);
    console.log('listening on *:3000');
})

function buscar_primera_mesa_abierta() {
    var debo_crear_mesa = false;
    var primera_mesa_abierta = false;
    if (mesas.length != 0) {
        for (var numero_de_mesa in mesas) {
            if (!la_mesa_esta_cerrada(numero_de_mesa) && primera_mesa_abierta === false) {
                primera_mesa_abierta = numero_de_mesa;
            }
        }
        if (primera_mesa_abierta === false) {
            debo_crear_mesa = true;
            primera_mesa_abierta = mesas.length;
        }
    } else {
        debo_crear_mesa = true;
        primera_mesa_abierta = 0;
    }
    if (debo_crear_mesa) {
        crear_mesa();
    }
    return primera_mesa_abierta;
}

function crear_mesa() {

    mesas.push({ 'jugadores': [] });
}

function la_mesa_esta_cerrada(numero_de_mesa) {
    var listos = 0;
    if (mesas[numero_de_mesa].jugadores.length < 2) {
        return false;
    }
    for (var i = mesas[numero_de_mesa].jugadores.length - 1; i >= 0; i--) {
        if (mesas[numero_de_mesa].jugadores[i].estoy_listo) {
            listos++;
        }
    }
    if (listos == mesas[numero_de_mesa].jugadores.length) {
        return true;
    }
    return false;
}

function sentar_jugador_en_una_mesa(numero_de_mesa, jugador) {

    mesas[numero_de_mesa].jugadores.push(jugador);
}

function obtener_mesa_de_jugador(jugador) {
    numero_de_mesa = false;
    for (index in mesas) {
        if (mesas[index].id = jugador.id) {
            numero_de_mesa = index;
        }
    }

    return numero_de_mesa;
}

function sortear_turno(numero_de_mesa) {
    var posicion = Math.floor(Math.random() * (mesas[numero_de_mesa].jugadores.length - 1));
    return posicion;
}

function turno_siguiente(numero_de_mesa, id_anterior) {
    var jugadores = mesas[numero_de_mesa].jugadores;
    var posicion = false;
    var proximo = false;
    for (var index in jugadores) {
        if (jugadores[index].id == id_anterior) {
            proximo = parseInt(index) + 1;
            if (proximo <= jugadores.length - 1) {
                return proximo;
            }
            return 0;
        }
    };
    return false;
}

function rodar_dados() {
    var cubilete = [];
    var dados = [
        ["U", "E", "A", "J", "R", "N"],
        ["I", "A", "N", "T", "P", "E"],
        ["O", "F", "L", "S", "W", "B"],
        ["J", "E", "Ñ", "R", "A", "U"],
        ["A", "E", "U", "R", "N", "I"],
        ["K", "F", "Ñ", "R", "A", "V"],
        ["G", "C", "S", "X", "O", "L"],
        ["X", "O", "B", "L", "F", "S"],
        ["I", "P", "T", "M", "D", "*"],
        ["T", "D", "H", "Z", "O", "LL"],
        ["N", "Q", "I", "E", "A", "U"],
        ["M", "T", "P", "I", "D", "*"],
        ["H", "O", "S", "L", "C", "Y"]
    ];
    for (var i = 12; i >= 0; i--) {
        var letra = dados[i][cara_aleatoria()];
        cubilete.push({ 'valor': sumar_letra(letra), 'letra': letra });
    }
    // Falta sortear la posicion de los dados
    return cubilete;
}

function cara_aleatoria() {
    // mejorar esto
    return Math.floor(Math.random() * 5.99);
}

function sumar_tablero(tablero) {
    var suma = 0;
    var palabras = obtener_palabras(tablero);
    console.log(palabras);
    for (var index in palabras) {
        suma += sumar_palabra(palabras[index]);
    }
    console.log(suma);
    return suma;
}

function obtener_palabras(tablero, rotar) {
    var palabras = [];
    var palabra;
    var letra;
    var index;
    if (typeof rotar === 'undefined') {
        rotar = true;
    }
    // Palabras horizontales
    for (var i = 0; i < cuadriculas * cuadriculas; i = i + cuadriculas) {
        palabra=[];
        for (var j = 0; j < cuadriculas; j++) {
            index = i + j;
            if (index in tablero) {
                letra = tablero[index];
                palabra.push(letra);
            } else {
                if (palabra.length > 1) {
                    palabras.push(palabra);
                }
                palabra=[];
            }
        }
        if (palabra.length > 1) {
            palabras.push(palabra);
        }
        palabra=[];

    }
    if (rotar) {
        tablero_rotado = rotar_tablero(tablero);
        palabras_rotadas = obtener_palabras(tablero_rotado, false);
        palabras=palabras.concat(palabras_rotadas);
    }
    return palabras;
}

function rotar_tablero(tablero) {
    var tablero_rotado = [];
    var index;
    var index_rotado;
    var columnas=cuadriculas;
    var filas=cuadriculas;
    var h=0;
    var k=columnas*filas-1;
    for (var i = 0; i < filas*columnas; i=i+columnas) {
        k=k-(filas-1);
        for (var j = 0; j < columnas; j++) {
            h=k-(columnas+1)*j;
            index=i+j;
            index_rotado=index+h;
            if(index in tablero){
                tablero_rotado[index_rotado] = tablero[index];
            }
        }
    }
    return tablero_rotado;
}

function sumar_palabra(palabra) {
    var suma = 0;
    for (var index in palabra) {
        suma += sumar_letra(palabra[index]);
    }
    return suma;
}

function sumar_letra(letra) {
    var valores = {
        "*": 0,
        "A": 1,
        "B": 4,
        "C": 4,
        "D": 3,
        "E": 1,
        "F": 4,
        "G": 4,
        "H": 3,
        "I": 2,
        "J": 6,
        "K": 5,
        "L": 2,
        "LL": 5,
        "M": 3,
        "N": 2,
        "Ñ": 4,
        "O": 1,
        "P": 4,
        "Q": 8,
        "R": 2,
        "S": 2,
        "T": 2,
        "U": 3,
        "V": 4,
        "W": 8,
        "X": 8,
        "Y": 4,
        "Z": 10
    };
    return valores[letra];
}
function guardar_tablero(tablero)
{
    
}