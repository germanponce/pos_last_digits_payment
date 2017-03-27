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

        this.keyboard_keydown_handler = function(event){
            
            var target_element = event['target']['id'];
            if (target_element == 'note_box_id'){
                console.log("Escribiendo en mi input");
                console.log("String.fromCharCode(e.keyCode)");
                var key = event.keyCode;
                var char_key = String.fromCharCode((96 <= key && key <= 105)? key-48 : key);

                console.log(String.fromCharCode((96 <= key && key <= 105)? key-48 : key));
                if (event.keyCode === 8 || event.keyCode === 46) { // Backspace and Delete
                    self.payment_note_minus();
                }
                self.payment_note(char_key);

            }

            else {
                console.log("Escribiendo sobre el Pago");
                if (event.keyCode === 8 || event.keyCode === 46) { // Backspace and Delete
                    event.preventDefault();
                    self.keyboard_handler(event);
                }
            }
            
        };
        
        this.keyboard_handler = function(event){
            var key = '';
            var target_element = event['target']['id'];
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
        var self = this;
        var input_val = $('#note_box_id').val();
        self.pos.get('selectedOrder').set_note(input_val);

    },
    payment_note_minus: function() {

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


});