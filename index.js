import React, {Component} from 'react';
import AWS from 'aws-sdk';
import {AWSIoTData} from './aws-iot-device-sdk-js-react-native.js';
import { decodeMessage } from './util';

class AWSIoTMQTT extends Component {
    
    constructor(props){
        super(props);
        this.type = props.type === 'shadow' ? 'thingShadow' : 'device';
        this.service = null;
        this.registry = {};
        this.subscribedTopics = {};
    }
    
    componentDidMount(){
        let self = this;
        const config = {
            //
            // Set the AWS region we will operate in.
            //
            region: this.props.region,
            host: this.props.host,
            //
            // Connect via secure WebSocket
            //
            protocol: 'wss',
            //
            // Set the maximum reconnect time to 8 seconds; this is a browser application
            // so we don't want to leave the user waiting too long for reconnection after
            // re-connecting to the network/re-opening their laptop/etc...
            //
            maximumReconnectTimeMs: 8000,
            //
            // Enable console debugging information (optional)
            //
            debug: false,
            keepAlive: 10,
            //
            // IMPORTANT: the AWS access key ID, secret key, and sesion token must be
            // initialized with empty strings.
            //
            accessKeyId: '',
            secretKey: '',
            sessionToken: ''
        };
    
        if (this.props.config) {
            Object.assign(config, this.props.config);
        }

        console.log("CONFIG", config);
        console.log(this.type);
        
        this.service = AWSIoTData[this.type](config);
        
        if (this.props.onConnect) {
            this.service.on('connect', this.props.onConnect);
        }

        if (this.props.onTimeout) {
            this.service.on('timeout', this.props.onTimeout);
        }
        
        if (this.props.onReconnect) {
            this.service.on('reconnect', this.props.onReconnect);
        }

        if (this.props.onError) {
            this.service.on('error', this.props.onError);
        }
        
        if (this.props.onDelta) {
            this.service.on('delta', this.props.onDelta);
        }
    
        if (this.props.onStatus) {
            this.service.on('status', this.props.onStatus);
        }
    
        if (this.props.onClose) {
            this.service.on('close', this.props.onClose);
        }
    
        if (this.props.onOffline) {
            this.service.on('offline', this.props.onOffline);
        }

        if (this.props.onMessage) {
            this.service.on('message', (topic, message) => {
                // const messages = self._deframeMessages(message);
                this.props.onMessage(topic, message.toString())
            })
        }

        this.service.on('accepted', (thingName, stateObject) => {
            console.log("accepted", thingName, stateObject)
        })
    }
    
    addThing (thingId, extraConfig ) {
        if (this.type==='device') {
            console.warn('addthing is only supported for shadows implementations');
            return;
        }
        if (this.registry[thingId]) {
            if (this.props.onThingConnected) {
                this.props.onThingConnected(thingId);
            }
            return;
        }
        let config = {
            persistentSubscribe: true
        };
        if (extraConfig) {
            Object.assign(config, extraConfig);
        }
        this.registry[thingId] = config;
        let callback = null;
        if (this.props.onThingConnected) {
            callback = this.props.onThingConnected.bind(null, thingId ) ;
        }
        this.service.register(thingId, config, callback );
        
        this.service.on('close', () => {
            delete this.registry[thingId];
            this.service.unregister(thingId);
        });
    }

    get(thingId) {
        if (!this.registry[thingId]) {
            console.warn('Thing is not registered');
        }

        const clientToken = this.service.get(thingId);
        return clientToken;
    }

    update(thingId, stateObject) {
        const token = this.service.update(thingId, stateObject)
        return token;
    }

    subscribe(topicName, extraConfig) {
        for (let i=0;i<topicName.length;i++) {
            let topic = topicName[i];

            if (this.subscribedTopics[topic]) {
                console.log("You are already subscribed to this topic");
                continue;
            }
            this.subscribedTopics;
            let config = {
                qos: 1
            }
            if (extraConfig) {
                Object.assign(config, extraConfig);
            }
            this.subscribedTopics[topic] = config;
            this.service.subscribe(topic, config, (err, granted) => {
                if (err) console.warn("SUBSCRIPTON_ERROR", err);
                if (this.props.onSubscription) {
                    this.props.onSubscription(granted);
                }
            })
        }
    }

    unregister(thingName) {
        if (typeof thingName === 'string') {
            delete this.registry[thingName];
            this.service.unregister(thingName);
        }
    }

    delete(thingName) {
        if (typeof thingName === 'string') {
            delete this.registry[thingName];
            const token = this.service.delete(thingName);
            return token;
        }
        return null;
    }
    
    render (){
        return null
    }
}

export default AWSIoTMQTT;

export { AWSIoTData };
