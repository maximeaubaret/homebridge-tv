
/**
 * Module dependencies.
 */
var SamsungRemote = require("samsung-remote");
var exec = require("child_process").exec;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-tv", "TV", TVAccessory);
};

class TVAccessory {

  constructor(log, config) {
    this.log = log;
    this.name = config.name;
    this.service = new Service.Switch(this.name);

    this.ip = config.ip;

    this.service.getCharacteristic(Characteristic.On)
  		.on("get", this._onGetOn.bind(this))
  		.on("set", this._onSetOn.bind(this));
  }

  getInformationService() {
    var informationService = new Service.AccessoryInformation();
    informationService
    .setCharacteristic(Characteristic.Name, this.name)
    .setCharacteristic(Characteristic.Manufacturer, "Maxime Aubaret")
    .setCharacteristic(Characteristic.Model, "1.0.0")
    .setCharacteristic(Characteristic.SerialNumber, this.ip);
    return informationService;
  }

  getServices() {
    return [this.service, this.getInformationService()];
  }

  _onGetOn(cb) {
    this.isAlive((isOn) => {
      cb(null, isOn)
    });
  }

  _onSetOn(on, cb) {
    this.isAlive((isOn) => {
      if (isOn) {
        return this.turnOff(() => cb(null));
      }

      return this.turnOn(() => cb(null));
    });
  }

  /**
   * Checks if the TV is on.
   */
  isAlive(cb) {
    this.log("Checking the status of the TV...");
    return exec(`ping -c 1 -t 1 ${this.ip}`, (err) => {
      if (err) {
        this.log("TV is OFF.");
        return cb(false);
      }

      this.log("TV is ON.");
      cb(true);
    });
  }

  /**
   * Turns on the TV.
   *
   * Since you cannot turn on the TV from the network, wake up the TV
   * through the AppleTV by playing a fake file through Airplay. Works
   * like a charm.
   */
  turnOn(cb) {
    this.log("Turning on the TV...");
    var browser = require("airplay").createBrowser();
    browser.on("deviceOnline", (device) => {
      device.play("http://foo/bar", 0, () => {
        device.close();
        browser.stop();

        // Wait 15 secs for the TV to connect to the network again...
        setTimeout(() => {
          this.log("TV should be ON.");
          cb(null);
        }, 15 * 1000);
      });
    });
    browser.start();
  }

  /**
   * Turns off the TV.
   *
   * Use the Samsung remote API to power off the TV.
   */
  turnOff(cb) {
    this.log("Turning off the TV...");
    var remote = new SamsungRemote({ ip: this.ip });

    remote.send("KEY_POWEROFF", (err) => {
      this.log("TV should be OFF.");
      cb(err);
    });
  }

}
