# -*- coding: utf-8 -*-
##############################################################################
#
#    OpenERP, Open Source Management Solution
#    Copyright (C) 2004-2010 Tiny SPRL (<http://tiny.be>).
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
##############################################################################

{
    'name': 'Captura de los ultimos 4 Digitos en el Punto de Venta',
    'version': '1.0.0',
    'category': 'Point Of Sale',
    'sequence': 6,
    'summary': '',
    'description': """
    
    Este modulo permite capturar los ultimos 4 Digitos del Punto de Venta para pagos con Tarjeta.
        
    """,
    'author' : 'German Ponce Dominguez',

    'website' : 'http://www.argil.mx',
   
    'depends': ['web','point_of_sale'],
    
    'installable': True,
    
    'data': [
        'templates.xml',
        'pos.xml',
        ],
    
    'qweb': ['static/src/xml/pos_notes.xml'],
 
    'auto_install': False,
}