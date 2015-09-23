(function() {
    'use strict';
    var module = angular.module('app', ['onsen', 'angular-storage']);
    module.constant('APP_VERSION', '1.0.0');
    module.constant('APP_NAME', '大津市祭り');
    module.constant('SERVER_URL', 'http://ec2-52-24-104-59.us-west-2.compute.amazonaws.com/drupal/');

    var listDialog = null;

    document.addEventListener('deviceready', function() {
        angular.bootstrap(document, ['app']);
    }, false);

    function obj_dump(obj) {
        var txt = '';
        for (var one in obj) {
            txt += one + "=" + obj[one] + "\n";
        }
        navigator.notification.alert(txt, function() {});
    }
    /**
     * TOPページのコントローラ
     */
    module.controller('AppController', function($scope, $http, SERVER_URL, beaconService, store) {

        // サーバからビーコン情報を取得
        var result = beaconService.getList();
        result.then(function(msg) {

            cordova.plugins.locationManager.requestAlwaysAuthorization();

            var delegate = new cordova.plugins.locationManager.Delegate();

            delegate.didDetermineStateForRegion = function(pluginResult) {
                //navigator.notification.alert('didDetermineStateForRegion:' + JSON.stringify(pluginResult));
            };

            delegate.didStartMonitoringForRegion = function(pluginResult) {
                //navigator.notification.alert('didStartMonitoringForRegion:' + JSON.stringify(pluginResult));
            };

            delegate.didRangeBeaconsInRegion = function(pluginResult) {
                //navigator.notification.alert('didRangeBeaconsInRegion:' + JSON.stringify(pluginResult));
            };

            delegate.didEnterRegion = function(pluginResult) {
                  cordova.plugins.locationManager.appendToDeviceLog('[DOM] didEnterRegion: '
        + JSON.stringify(pluginResult));
              navigator.notification.alert('didEnterRegion:' + JSON.stringify(pluginResult));
                navigator.notification.alert('ビーコンを検出しました:', function() {
                    ons.createDialog('page/pop_list.html').then(function(dialog) {
                        dialog.show();
                    });
                });
            };

            delegate.didExitRegion = function(pluginResult) {
                // navigator.notification.alert('didExitRegion:' + JSON.stringify(pluginResult));
            };

            cordova.plugins.locationManager.setDelegate(delegate);
            var beaconList = store.get('beacons');

            angular.forEach(beaconList, function(beacon, i) {
                var bObj = beacon.beacon;

                var beaconRegion = new cordova.plugins.locationManager.BeaconRegion(bObj.Identifer, bObj.UUID, bObj.Major, bObj.Minor);
                cordova.plugins.locationManager.startMonitoringForRegion(beaconRegion)
                    .fail(console.error)
                    .done(navigator.notification.alert('test'));
                // navigator.notification.alert('uuid : ' + beacon.beacon.uuid);
            });

            // navigator.notification.alert(msg, function() {
            //     ons.createDialog('page/pop_list.html').then(function(dialog) {
            //         dialog.show();
            //     });
            // });

        }, function(msg) {
            navigator.notification.alert(msg, function() {});
        });




    });


    module.controller('ListController', function($scope, $http, SERVER_URL, beaconService, store) {

        $scope.items = store.get('beacons');

        $scope.$on('beacon:changeList', function(data) {
            $scope.items = store.get('beacons');
        });

        $scope.toDetail = function() {
            $scope.navi.pushPage('page/detail.html', {
                animation: 'slide'
            });
        };
    });

    /**
     * Beacon情報関連のService
     *
     */
    module.factory('beaconService', function($http, $q, $rootScope, $timeout, store, SERVER_URL) {
        var service = {
            detailObj: null,

            /**
             * サーバから一覧情報を取得
             */
            getList: function(callback) {
                var defer = $q.defer();

                $http.get(SERVER_URL + 'beacons').then(function(response) {
                    store.set('beacons', response.data.beacons); // ストレージに一覧情報をセット
                    if (typeof callback == 'function') {
                        callback(response.data.beacons);
                    }
                    // 変更があったことをControllerに通知する
                    $rootScope.$broadcast('beacon:changeList', response.data.beacons);
                    defer.resolve('success');
                }).then(function() {
                    return defer.reject('Beacon情報の取得に失敗しました');
                });
                return defer.promise;
            },

            /**
             *サーバから詳細情報を取得
             */
            getDetail: function(identifier, callback) {
                var defer = $q.defer();

                $http.get(SERVER_URL + 'hikiyama-detail' + '?identifier=' + identifier).then(function(response) {
                    service.detailObj = response.data.hikiyamas.hikiyama;
                    if (typeof callback == 'function') {
                        callback(response.data.hikiyamas.hikiyama);
                    }
                    return defer.promise;
                }).then(function(response) {
                    return defer.reject();
                });
            }
        };
        return service;
    });

    module.factory('beaconMasterService', function() {
        var service = {};

        return service;
    });
})();
