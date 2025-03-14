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
	illuminance: {
        cluster: 'msIlluminanceMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty('measuredValue')) {
                const illuminance_raw = msg.data['measuredValue'];
                const illuminance = illuminance_raw === 0 ? 0 : Math.pow(10, (illuminance_raw - 1) / 10000);
                result.illuminance = illuminance;
                result.illuminance_raw = illuminance_raw;
                }
            return result;
        },
    },
};

const definition = {
        zigbeeModel: ['EFEKTA_eFlora'],
        model: 'EFEKTA_eFlora',
        vendor: 'Custom devices (DiY)',
        description: '[Plant Wattering Sensor with e-ink display 1.02](https://efektalab.com/eFlora)',
        fromZigbee: [fz.temperature, fzLocal.illuminance, fz.humidity, fz.soil_moisture, fz.battery, fzLocal.node_config, fzLocal.config_disp, fzLocal.sm_config],
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
        icon: 'data:image/jpeg;base64,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dHRvbWxvbmcAAAAAAAAADGNyb3BSZWN0TGVmdGxvbmcAAAAAAAAADWNyb3BSZWN0UmlnaHRsb25nAAAAAAAAAAtjcm9wUmVjdFRvcGxvbmcAAAAAADhCSU0D7QAAAAAAEABIAAAAAQABAEgAAAABAAE4QklNBCYAAAAAAA4AAAAAAAAAAAAAP4AAADhCSU0EDQAAAAAABAAAAFo4QklNBBkAAAAAAAQAAAAeOEJJTQPzAAAAAAAJAAAAAAAAAAABADhCSU0nEAAAAAAACgABAAAAAAAAAAE4QklNA/UAAAAAAEgAL2ZmAAEAbGZmAAYAAAAAAAEAL2ZmAAEAoZmaAAYAAAAAAAEAMgAAAAEAWgAAAAYAAAAAAAEANQAAAAEALQAAAAYAAAAAAAE4QklNA/gAAAAAAHAAAP////////////////////////////8D6AAAAAD/////////////////////////////A+gAAAAA/////////////////////////////wPoAAAAAP////////////////////////////8D6AAAOEJJTQQAAAAAAAACAAE4QklNBAIAAAAAAAQAAAAAOEJJTQQwAAAAAAACAQE4QklNBC0AAAAAAAYAAQAAAAI4QklNBAgAAAAAABAAAAABAAACQAAAAkAAAAAAOEJJTQQeAAAAAAAEAAAAADhCSU0EGgAAAAADSwAAAAYAAAAAAAAAAAAAAIIAAACCAAAACwQRBDUENwAgBDgEPAQ1BD0EOAAtADEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAIIAAACCAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAEAAAAAAABudWxsAAAAAgAAAAZib3VuZHNPYmpjAAAAAQAAAAAAAFJjdDEAAAAEAAAAAFRvcCBsb25nAAAAAAAAAABMZWZ0bG9uZwAAAAAAAAAAQnRvbWxvbmcAAACCAAAAAFJnaHRsb25nAAAAggAAAAZzbGljZXNWbExzAAAAAU9iamMAAAABAAAAAAAFc2xpY2UAAAASAAAAB3NsaWNlSURsb25nAAAAAAAAAAdncm91cElEbG9uZwAAAAAAAAAGb3JpZ2luZW51bQAAAAxFU2xpY2VPcmlnaW4AAAANYXV0b0dlbmVy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YWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE4IChXaW5kb3dzKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjMtMTItMDVUMjE6NDQ6NTgrMDM6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjMtMTItMDVUMjE6NDQ6NTgrMDM6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDIzLTEyLTA1VDIxOjQ0OjU4KzAzOjAwIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjc1NGZlZTllLTJkMWMtMTg0Zi04M2NhLWEwYzYwN2Q5YWIxYiIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOjVjMWMxNzJmLWEzYWEtOWM0Ny1iYTMxLTQyNTdlMmE1MWNiMCIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjk5YThiMzRiLWFlOGItMmM0Ny05OWZjLTc4NWU4ZmY0YjEyNyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgZGM6Zm9ybWF0PSJpbWFnZS9qcGVnIj4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDo5OWE4YjM0Yi1hZThiLTJjNDctOTlmYy03ODVlOGZmNGIxMjciIHN0RXZ0OndoZW49IjIwMjMtMTItMDVUMjE6NDQ6NTgrMDM6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE4IChXaW5kb3dzKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6NzU0ZmVlOWUtMmQxYy0xODRmLTgzY2EtYTBjNjA3ZDlhYjFiIiBzdEV2dDp3aGVuPSIyMDIzLTEyLTA1VDIxOjQ0OjU4KzAzOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOCAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDxwaG90b3Nob3A6RG9jdW1lbnRBbmNlc3RvcnM+IDxyZGY6QmFnPiA8cmRmOmxpPjNGNTVCOUZDQzUwQUY1QjI5MDM0NDVDRUVCMDlENUY5PC9yZGY6bGk+IDxyZGY6bGk+NzcwRUY5MzdFREIwMTEzQkM0NUQzQjQyODhBREY5MkU8L3JkZjpsaT4gPHJkZjpsaT43NzgzNEMzMjU3NEUzNDhEQkJFMUJGNEYxRUIzNDE1OTwvcmRmOmxpPiA8cmRmOmxpPmFkb2JlOmRvY2lkOnBob3Rvc2hvcDozN2Q4MWM4ZS0yZDM0LTRhNDUtYjRkMi05ODAzMzhmZjFjY2I8L3JkZjpsaT4gPHJkZjpsaT5hZG9iZTpkb2NpZDpwaG90b3Nob3A6NTY0ZDg0OTYtNWU3NC1lMzQzLTkyOGYtMTBjY2FiZTdkNDg2PC9yZGY6bGk+IDwvcmRmOkJhZz4gPC9waG90b3Nob3A6RG9jdW1lbnRBbmNlc3RvcnM+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDw/eHBhY2tldCBlbmQ9InciPz7/7gAhQWRvYmUAZEAAAAABAwAQAwIDBgAAAAAAAAAAAAAAAP/bAIQAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB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',
        exposes: [e.soil_moisture(), e.battery(), e.battery_low(), e.battery_voltage(), e.temperature(), e.humidity(), e.illuminance(),
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
