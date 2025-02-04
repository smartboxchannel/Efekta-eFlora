const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const constants = require('zigbee-herdsman-converters/lib/constants');
const e = exposes.presets;
const ea = exposes.access;

async function onEventSetLocalTime(type, data, device) {
 
    if (data.type === 'attributeReport' && data.cluster === 'genTime') {
	    try {	
            const endpoint = device.getEndpoint(1);
            const time = Math.round((((new Date()).getTime() - constants.OneJanuary2000) / 1000) + (((new Date()).getTimezoneOffset() * -1) * 60));
            await endpoint.write('genTime', {time: time});
        }catch (error) {
            // endpoint.write can throw an error which needs to
            // be caught or the zigbee-herdsman may crash
            // Debug message is handled in the zigbee-herdsman
        }
    }
}

const definition = {
        zigbeeModel: ['EFEKTA_eFlora'],
        model: 'EFEKTA_eFlora',
        vendor: 'Custom devices (DiY)',
        description: '[Plant Wattering Sensor with e-ink display 1.02](https://efektalab.com/eFlora)',
        fromZigbee: [fz.temperature, fz.illuminance, fz.humidity, fz.soil_moisture, fz.battery],
        toZigbee: [tz.factory_reset],
        onEvent: onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, [
                'genTime', 'genPowerCfg', 'msIlluminanceMeasurement', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msSoilMoisture']);
        },
        exposes: [e.soil_moisture(), e.battery(), e.battery_low(), e.battery_voltage(), e.temperature(), e.humidity(), e.illuminance_lux(), e.illuminance()],
};

module.exports = definition;
