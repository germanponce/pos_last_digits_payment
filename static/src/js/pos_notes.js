odoo.define('pos_last_digits_payment.pos_last_digits_payment', function (require) {
"use strict";

var models = require('point_of_sale.models');
var screens = require('point_of_sale.screens');

var BarcodeParser = require('barcodes.BarcodeParser');
var PosDB = require('point_of_sale.DB');
var devices = require('point_of_sale.devices');
var core = require('web.core');
var Model = require('web.DataModel');
var formats = require('web.formats');
var session = require('web.session');
var time = require('web.time');
var utils = require('web.utils');

var QWeb = core.qweb;
var _t = core._t;
var Mutex = utils.Mutex;
var round_di = utils.round_decimals;
var round_pr = utils.round_precision;
var Backbone = window.Backbone;

var exports = {};

var OrderlineCollection = Backbone.Collection.extend({
    model: exports.Orderline,
});

var PaymentlineCollection = Backbone.Collection.extend({
    model: exports.Paymentline,
});

console.log("PaymentScreenWidget");

screens.PaymentScreenWidget.include({
init: function(parent, options) {
        var self = this;
        this._super(parent, options);

        this.pos.bind('change:selectedOrder',function(){
                this.renderElement();
                this.watch_order_changes();
            },this);
        this.watch_order_changes();
        //this.click_input();
        this.inputbuffer = "";
        this.firstinput  = true;
        this.decimal_point = _t.database.parameters.decimal_point;
        
        // This is a keydown handler that prevents backspace from
        // doing a back navigation. It also makes sure that keys that
        // do not generate a keypress in Chrom{e,ium} (eg. delete,
        // backspace, ...) get passed to the keypress handler.

        this.keyboard_keydown_handler = function(event){
            
            //Mi variable target_element obtiene el ID del objeto donde se produce el evento
            var target_element = event['target']['id'];
            //Si el evento ocurren en mi input, creo un nuevo evento de teclado
            if (target_element == 'note_box_id'){
                console.log("Escribiendo en mi input");
                // Convierte un event.keycode, el codigo de evento en string
                console.log("String.fromCharCode(e.keyCode)");
                var key = event.keyCode;
                var char_key = String.fromCharCode((96 <= key && key <= 105)? key-48 : key);

                console.log(String.fromCharCode((96 <= key && key <= 105)? key-48 : key));
                // Si es pulsan la tecla borrar o suprimir
                if (event.keyCode === 8 || event.keyCode === 46) { // Backspace and Delete
                    self.payment_note_minus();
                }
                // Ejecutamos nuestro metodo que almacena los caracteres
                self.payment_note(char_key);

            }

            else {
                console.log("Escribiendo sobre el Pago");
                if (event.keyCode === 8 || event.keyCode === 46) { // Backspace and Delete
                    event.preventDefault();

                    // These do not generate keypress events in
                    // Chrom{e,ium}. Even if they did, we just called
                    // preventDefault which will cancel any keypress that
                    // would normally follow. So we call keyboard_handler
                    // explicitly with this keydown event.
                    self.keyboard_handler(event);
                }
            }
            //self.payment_note(String.fromCharCode(event.keyCode));
            
        };
        
        // This keyboard handler listens for keypress events. It is
        // also called explicitly to handle some keydown events that
        // do not generate keypress events.
        this.keyboard_handler = function(event){
            var key = '';
            // Variable que almacena el ID del objeto donde ocurre el evento
            var target_element = event['target']['id'];
            // Si no es mi input entra
            if (target_element != 'note_box_id'){

                if (event.type === "keypress") {
                    if (event.keyCode === 13) { // Enter
                        self.validate_order();
                    } else if ( event.keyCode === 190 || // Dot
                                event.keyCode === 110 ||  // Decimal point (numpad)
                                event.keyCode === 188 ||  // Comma
                                event.keyCode === 46 ) {  // Numpad dot
                        key = self.decimal_point;
                    } else if (event.keyCode >= 48 && event.keyCode <= 57) { // Numbers
                        key = '' + (event.keyCode - 48);
                    } else if (event.keyCode === 45) { // Minus
                        key = '-';
                    } else if (event.keyCode === 43) { // Plus
                        key = '+';
                    }
                } else { // keyup/keydown
                    if (event.keyCode === 46) { // Delete
                        key = 'CLEAR';
                    } else if (event.keyCode === 8) { // Backspace
                        key = 'BACKSPACE';
                    }
                }

                self.payment_input(key);
                event.preventDefault();
            }
        };

    },
    payment_note: function(input) {
        // input = variable que tecleo el usuario
        /*var newbuf = this.gui.numpad_input(this.inputbuffer, input, {'firstinput': this.firstinput});
        console.log("newbuf");
        console.log(newbuf);*/
        var self = this;
        /*console.log("INPUT >>>>>> ");
        console.log(input);
        console.log("this.firstinput");
        console.log(this.firstinput);
        console.log("this.inputbuffer");
        console.log(this.inputbuffer);
        console.log("$('#note_box_id').val();");
        console.log($('#note_box_id').val());*/
        // Obtengo el valor de mi input
        var input_val = $('#note_box_id').val();
        // Lo enviamos al pedido del pos
        self.pos.get('selectedOrder').set_note(input_val);
        // Este apartado obtenia manualmente y asignaba valores a mi input
        // Ya no es necesario debido a que el control es manual por la condicionante de arriba
        /*var input_val = $('#note_box_id').val();
        var newbuf= input_val+input;

        $('#note_box_id').val(newbuf);*/

    },
    payment_note_minus: function() {
        // input = variable que tecleo el usuario
        /*var newbuf = this.gui.numpad_input(this.inputbuffer, input, {'firstinput': this.firstinput});
        console.log("newbuf");
        console.log(newbuf);
        console.log("INPUT >>>>>> ");
        console.log(input);*/
        /* Este apartado ya no es necesario las condiciones
        se encargan de eliminar los valores */
        /*console.log("payment_note_minus");
        var input_val = $('#note_box_id').val();
        var size_input = input_val.length;
        console.log("INPUT VAL");
        console.log(input_val);
        console.log(input_val.length);
        console.log(size_input-1);
        var newbuf= input_val.substring(0,size_input-2)
        console.log(newbuf);
        $('#note_box_id').val(newbuf);*/

    },

    click_input: function(){
    console.log("CLICK INPUT >>>>> ");
        $('#note_box_id').on('keyup',function(event){
                    console.log(" CLICK INPUT >>>>>>> ");
                    console.log(event);
                }); 

    },

    });

models.Order = models.Order.extend({
    initialize: function(attributes,options){
        Backbone.Model.prototype.initialize.apply(this, arguments);
        options  = options || {};

        this.init_locked    = true;
        this.pos            = options.pos; 
        this.selected_orderline   = undefined;
        this.selected_paymentline = undefined;
        this.screen_data    = {};  // see Gui
        this.temporary      = options.temporary || false;
        this.creation_date  = new Date();
        this.to_invoice     = false;
        this.orderlines     = new OrderlineCollection();
        this.paymentlines   = new PaymentlineCollection(); 
        this.pos_session_id = this.pos.pos_session.id;
        this.finalized      = false; // if true, cannot be modified.
        // Inicializo mi variable
        this.note = "";

        this.set({ client: null });

        if (options.json) {
            this.init_from_JSON(options.json);
        } else {
            this.sequence_number = this.pos.pos_session.sequence_number++;
            this.uid  = this.generate_unique_id();
            this.name = _t("Order ") + this.uid;
            this.validation_date = undefined;
        }

        this.on('change',              function(){ this.save_to_db("order:change"); }, this);
        this.orderlines.on('change',   function(){ this.save_to_db("orderline:change"); }, this);
        this.orderlines.on('add',      function(){ this.save_to_db("orderline:add"); }, this);
        this.orderlines.on('remove',   function(){ this.save_to_db("orderline:remove"); }, this);
        this.paymentlines.on('change', function(){ this.save_to_db("paymentline:change"); }, this);
        this.paymentlines.on('add',    function(){ this.save_to_db("paymentline:add"); }, this);
        this.paymentlines.on('remove', function(){ this.save_to_db("paymentline:rem"); }, this);

        this.init_locked = false;
        this.save_to_db();

        return this;
    },

    export_as_JSON: function() {
        console.log("Export as JSON >>>>");
        var orderLines, paymentLines;
        orderLines = [];
        this.orderlines.each(_.bind( function(item) {
            return orderLines.push([0, 0, item.export_as_JSON()]);
        }, this));
        paymentLines = [];
        this.paymentlines.each(_.bind( function(item) {
            return paymentLines.push([0, 0, item.export_as_JSON()]);
        }, this));
        console.log("note: this.get_note()");
        console.log(this.get_note());
        return {
            name: this.get_name(),
            amount_paid: this.get_total_paid(),
            amount_total: this.get_total_with_tax(),
            amount_tax: this.get_total_tax(),
            amount_return: this.get_change(),
            lines: orderLines,
            statement_ids: paymentLines,
            pos_session_id: this.pos_session_id,
            partner_id: this.get_client() ? this.get_client().id : false,
            user_id: this.pos.cashier ? this.pos.cashier.id : this.pos.user.id,
            uid: this.uid,
            sequence_number: this.sequence_number,
            creation_date: this.validation_date || this.creation_date, // todo: rename creation_date in master
            fiscal_position_id: this.fiscal_position ? this.fiscal_position.id : false,
            // Exporto el valor de mi campo por medio de metodos
            note: this.get_note(),
        };
    },
    get_note: function(){
        console.log("GET NOTE >>> ");
        console.log(this.get('note'));
        return this.get('note');
    },
    set_note: function(note){
        console.log("SET NOTE >>> ");
        console.log(note);
        this.set('note', note);
    },   

});  
/*
models.Order = models.Order.extend({
    initialize: function(attributes,options){
        console.log("INITIALIZE >>> ");
        Backbone.Model.prototype.initialize.apply(this, arguments);
        options  = options || {};

        this.init_locked    = true;
        this.pos            = options.pos; 
        this.selected_orderline   = undefined;
        this.selected_paymentline = undefined;
        this.screen_data    = {};  // see Gui
        this.temporary      = options.temporary || false;
        this.creation_date  = new Date();
        this.to_invoice     = false;
        this.orderlines     = new OrderlineCollection();
        this.paymentlines   = new PaymentlineCollection(); 
        this.pos_session_id = this.pos.pos_session.id;
        this.finalized      = false; // if true, cannot be modified.
        this.note = "",

        this.set({ client: null });

        if (options.json) {
            this.init_from_JSON(options.json);
        } else {
            this.sequence_number = this.pos.pos_session.sequence_number++;
            this.uid  = this.generate_unique_id();
            this.name = _t("Order ") + this.uid;
            this.validation_date = undefined;
        }

        this.on('change',              function(){ this.save_to_db("order:change"); }, this);
        this.orderlines.on('change',   function(){ this.save_to_db("orderline:change"); }, this);
        this.orderlines.on('add',      function(){ this.save_to_db("orderline:add"); }, this);
        this.orderlines.on('remove',   function(){ this.save_to_db("orderline:remove"); }, this);
        this.paymentlines.on('change', function(){ this.save_to_db("paymentline:change"); }, this);
        this.paymentlines.on('add',    function(){ this.save_to_db("paymentline:add"); }, this);
        this.paymentlines.on('remove', function(){ this.save_to_db("paymentline:rem"); }, this);

        this.init_locked = false;
        this.save_to_db();

        return this;
    },
    export_as_JSON: function() {
        console.log("Export as JSON >>>>");
        var orderLines, paymentLines;
        orderLines = [];
        this.orderlines.each(_.bind( function(item) {
            return orderLines.push([0, 0, item.export_as_JSON()]);
        }, this));
        paymentLines = [];
        this.paymentlines.each(_.bind( function(item) {
            return paymentLines.push([0, 0, item.export_as_JSON()]);
        }, this));
        return {
            name: this.get_name(),
            amount_paid: this.get_total_paid(),
            amount_total: this.get_total_with_tax(),
            amount_tax: this.get_total_tax(),
            amount_return: this.get_change(),
            lines: orderLines,
            statement_ids: paymentLines,
            pos_session_id: this.pos_session_id,
            partner_id: this.get_client() ? this.get_client().id : false,
            user_id: this.pos.cashier ? this.pos.cashier.id : this.pos.user.id,
            uid: this.uid,
            sequence_number: this.sequence_number,
            creation_date: this.validation_date || this.creation_date, // todo: rename creation_date in master
            fiscal_position_id: this.fiscal_position ? this.fiscal_position.id : false,
            note: this.get_note(),
        };
    },
    save_to_db: function(){
        if (!this.temporary && !this.init_locked) {
            this.pos.db.save_unpaid_order(this);
        } 
    },
    get_note: function(){
        console.log("GET NOTE >>> ");
        console.log(this.get('note'));
        return this.get('note');
    },
    set_note: function(note){
        console.log("SET NOTE >>> ");
        console.log(note);
        this.set('note', note);
    },   

    });*/

});