import pygal
from pygal.style import LightGreenStyle
import logging

logger = logging.getLogger("Graphs")

def plot(data, title=None, graph_type='Pie'):
    if graph_type == 'Pie':
        pie_chart = pygal.Pie(disable_xml_declaration=True, style=LightGreenStyle)
    else:
        pie_chart = pygal.HorizontalBar(disable_xml_declaration=True, style=LightGreenStyle)
    if title:
        pie_chart.title = title
    for item in data:
        pie_chart.add(item[0], item[1])
    return pie_chart.render()