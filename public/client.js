var window = $(window);
var nombre_jugador_input = $('#nombre_jugador');
var pagina_inicio = $('#inicio');
var pagina_mesa = $('#mesa');
var pagina_resultados = $('#resultados');
var mi_nombre = false;
var mi_id = false;
var mi_turno = false;
var estoy_listo = false;
var tablero;
var socket = io();

$(function() {
    pagina_inicio.show();
    pagina_mesa.hide();
    pagina_resultados.hide();
    $("#rodar_dados").hide();
    $("#estoy_listo").hide();
    $("#sumar_tablero").hide();
    nombre_jugador.focus();

});
$('#buscar_mesa').submit(function() {
    mi_nombre = $('#nombre_jugador').val();
    socket.emit('req_buscar_mesa', mi_nombre);
    return false;
});
socket.on('tu_id', function(id) {
    mi_id = id;
})
socket.on('res_buscar_mesa', function(obj) {
    $("#mesa #jugadores").empty();
    $("#actividad").text('Estás listo?');
    pagina_inicio.hide();
    pagina_mesa.show();
    $("#estoy_listo").show();
    armar_tablero();
    $.each(obj, function(index, jugador) {
        $("#mesa #jugadores").append($('<span>').text(jugador.nombre));
    });
})
$('#estoy_listo').submit(function() {
    if (!estoy_listo) {
        estoy_listo = true;
        $("#estoy_listo").hide();
        socket.emit('req_estoy_listo', true);
    }
    return false;
});
socket.on('res_estoy_listo', function() {
    $("#actividad").text('Esperando jugadores...');
})
socket.on('turno', function(jugador) {
    vaciar_tablero();
    vaciar_cubilete();
    var mensaje = '';
    $("#estoy_listo ").hide();
    if (jugador.id != mi_id) {
        mensaje += 'Es el turno de ' + jugador.nombre;
        mi_turno = false;
        $("#rodar_dados").hide();
        $("#sumar_tablero").hide();
    } else {
        mensaje += 'Es tu turno, ' + jugador.nombre;
        $("#rodar_dados").show();
        $('.celda').attr('ondrop', 'drop(event)');
        $('.celda').attr('ondragover', 'allowDrop(event)');
        mi_turno = true;
    }
    $("#actividad").text(mensaje);
})
socket.on('res_sumar_tablero', function(obj) {
    $("#mesa #jugadores").empty();
    $.each(obj, function(index, jugador) {
        $("#mesa #jugadores").append($('<span>').text(jugador.nombre));
        $("#mesa #jugadores").append($('<span>').text(jugador.puntos));
    });
})

function armar_tablero() {
    var cuadriculas = 8;
    $("#tablero").empty();
    for (var i = 0; i < cuadriculas; i++) {
        var fila = $("<div>", {
            'class': 'fila'
        });
        $("#tablero").append(fila);
        for (var j = 0; j < cuadriculas; j++) {
            fila.append($("<span>", {
                'id': i * cuadriculas + j,
                'class': 'celda'
            }))
        }
    }
}

function vaciar_tablero() {
    tablero = {};
    $("#tablero div span").each(function() {
        $(this).empty();
    })
}

function vaciar_cubilete() {
    $("#dados").empty();
}
$('#rodar_dados').submit(function() {
    if (!mi_turno) return false;
    $("#sumar_tablero").show();
    socket.emit('req_rodar_dados');
    return false;
});

socket.on('res_rodar_dados', function(obj) {
    vaciar_cubilete();
    vaciar_tablero();
    var dado;
    $.each(obj, function(index, element) {
        dado = $('<div>', {
            'id': 'd_' + index + element.letra.charCodeAt(),
            'class': 'dado',
            'data-letra': element.letra,
        });
        $('#dados').append(dado);
        dado.append($('<div>').text(element.letra));
        dado.append($('<div>').text(element.valor));

    });
    $('.dado').prop('draggable', true);
    $('.dado').attr('ondragstart', 'drag(event)');
});

$('#sumar_tablero').submit(function() {
    if (!mi_turno) return false;
    socket.emit('req_sumar_tablero', tablero);
    return false;
});


function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("mi_id", ev.target.id);
}

function drop(ev) {
    ev.preventDefault();
    agregar_dado(ev.dataTransfer.getData("mi_id"), ev.target.closest('.celda').getAttribute('id'));
}

function agregar_dado(id_dado, id_celda) {
    if (!mi_turno) return false;
    var obj = {
        'id_dado': id_dado,
        'id_celda': id_celda
    };
    socket.emit('req_agregar_dado', obj);
    return false;
}

socket.on('res_agregar_dado', function(obj) {
    var id_dado = obj.id_dado;
    var id_celda = obj.id_celda;
    var dado = $("#" + id_dado);
    var padre = dado.parent();
    var hijo = $("#" + id_celda).children().eq(0);
    if (padre.attr('class') == 'celda') {
        console.log('Se mueve el dado de celda');
        delete tablero[padre.attr('id')];
    }
    if (hijo.attr('class') == 'dado') {
        console.log('La celda ya estaba ocupada');
        $("#dados").append(hijo);
    }
    $("#" + id_dado).click(function() {
        $("#dados").append($(this));
        delete tablero[id_celda];
    });
    $("#" + id_celda).append(dado);
    tablero[id_celda] = dado.attr('data-letra');
});
