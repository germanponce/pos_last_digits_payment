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

import logging
import time

from openerp import tools
from openerp import api, fields, models, _
from openerp.tools.translate import _

import openerp.addons.decimal_precision as dp
import openerp.addons.product.product
import base64
from ast import literal_eval
from openerp.tools import pickle as cPickle

_logger = logging.getLogger(__name__)
    
class pos_order(models.Model):
    _inherit = 'pos.order'    

    reference_payment = fields.Char('Ultimos 4 Digitos', size=64)


