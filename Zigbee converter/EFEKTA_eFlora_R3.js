const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const constants = require('zigbee-herdsman-converters/lib/constants');
const e = exposes.presets;
const ea = exposes.access;


const tzLocal = {
    node_config: {
        key: ['reading_interval'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
                reading_interval: ['genPowerCfg', {0x0201: {value, type: 0x21}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
	config_disp: {
        key: ['invert'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
				invert: ['genPowerCfg', {0x0210: {value, type: 0x10}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
	sm_config: {
        key: ['lower_level', 'upper_level', 'mode1', 'mode2'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
                mode1: ['msSoilMoisture', {0x0504: {value, type: 0x10}}],
				mode2: ['msSoilMoisture', {0x0505: {value, type: 0x10}}],
				lower_level: ['msSoilMoisture', {0x0502: {value, type: 0x21}}],
				upper_level: ['msSoilMoisture', {0x0503: {value, type: 0x21}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
};

const fzLocal = {
    node_config: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0201)) {
                result.reading_interval = msg.data[0x0201];
            }
            return result;
        },
    },
	config_disp: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0210)) {
                result.invert = ['OFF', 'ON'][msg.data[0x0210]];
            }
            return result;
        },
    },
	sm_config: {
        cluster: 'msSoilMoisture',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0504)) {
                result.mode1 = ['OFF', 'ON'][msg.data[0x0504]];
            }
			if (msg.data.hasOwnProperty(0x0505)) {
                result.mode2 = ['OFF', 'ON'][msg.data[0x0505]];
            }
			if (msg.data.hasOwnProperty(0x0500)) {
                result.bat_adc = msg.data[0x0500];
            }
            if (msg.data.hasOwnProperty(0x0499)) {
                result.sm_adc_compens = msg.data[0x0499];
            }
			if (msg.data.hasOwnProperty(0x0501)) {
                result.sm_adc = msg.data[0x0501];
            }
			if (msg.data.hasOwnProperty(0x0502)) {
                result.lower_level = msg.data[0x0502];
            }
			if (msg.data.hasOwnProperty(0x0503)) {
                result.upper_level = msg.data[0x0503];
            }
            return result;
        },
    },
};

const definition = {
        zigbeeModel: ['EFEKTA_eFlora'],
        model: 'EFEKTA_eFlora',
        vendor: 'Custom devices (DiY)',
        description: '[Plant Wattering Sensor with e-ink display 1.02](https://efektalab.com/eFlora',
        fromZigbee: [fz.temperature, fz.illuminance, fz.humidity, fz.soil_moisture, fz.battery, fzLocal.node_config, fzLocal.config_disp, fzLocal.sm_config],
        toZigbee: [tz.factory_reset, tzLocal.node_config, tzLocal.sm_config, tzLocal.config_disp],
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, [
                'genPowerCfg', 'genTime', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msIlluminanceMeasurement', 'msSoilMoisture']);
			const overrides1 = {min: 3600, max: 21600, change: 1};
			const overrides2 = {min: 300, max: 3600, change: 25};
			const overrides3 = {min: 300, max: 3600, change: 50};
			const overrides4 = {min: 600, max: 3600, change: 10};
			const overrides5 = {min: 1800, max: 21600, change: 100};
            await reporting.batteryVoltage(firstEndpoint, overrides1);
            await reporting.batteryPercentageRemaining(firstEndpoint, overrides1);
			await reporting.batteryAlarmState(firstEndpoint, overrides1);
            await reporting.temperature(firstEndpoint, overrides2);
            await reporting.humidity(firstEndpoint, overrides3);
            await reporting.illuminance(firstEndpoint, overrides4);
            await reporting.soil_moisture(firstEndpoint, overrides5);
        },
        exposes: [e.soil_moisture(), e.battery(), e.battery_low(), e.battery_voltage(), e.temperature(), e.humidity(), e.illuminance_lux(), e.illuminance(),
		    exposes.numeric('reading_interval', ea.STATE_SET).withUnit('Minutes').withDescription('Setting the sensor reading interval Setting the time in minutes, by default 5 minutes')
                .withValueMin(1).withValueMax(360),
			exposes.numeric('lower_level', ea.STATE_SET).withUnit('%').withDescription('The lower level of soil moisture 0% is:')
                .withValueMin(0).withValueMax(99),
			exposes.numeric('upper_level', ea.STATE_SET).withUnit('%').withDescription('The upper level of soil moisture 100% is:')
                .withValueMin(1).withValueMax(100),
			exposes.binary('invert', ea.STATE_SET, 'ON', 'OFF').withDescription('Invert display color'),
			exposes.binary('mode1', ea.STATE_SET, 'ON', 'OFF').withDescription('Measurement method'),
			exposes.binary('mode2', ea.STATE_SET, 'ON', 'OFF').withDescription('Temperature compensation')],
			//exposes.binary('mode2', ea.STATE_SET, 'ON', 'OFF').withDescription('Temperature compensation'),
			//exposes.numeric('bat_adc', ea.STATE).withDescription('Battery RAW Data'),
			//exposes.numeric('sm_adc', ea.STATE).withDescription('SM RAW Data'),
			//exposes.numeric('sm_adc_compens', ea.STATE).withDescription('SM RAW Compensated Data')],
};

module.exports = definition;
