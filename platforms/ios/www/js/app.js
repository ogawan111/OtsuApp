(function() {
    'use strict';
    var module = angular.module('app', ['onsen', 'angular-storage']);
    module.constant('APP_VERSION', '1.0.0');
    module.constant('APP_NAME', '大津市祭り');
    module.constant('SERVER_URL', 'http://ec2-52-24-104-59.us-west-2.compute.amazonaws.com/drupal/');

    document.addEventListener('deviceready', function() {
        localStorage.clear();
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
    module.controller('AppController', function($scope, $rootScope, $http, SERVER_URL, beaconService, hikiyamaService, store) {

        // サーバからビーコン情報を取得
        var result = beaconService.getList();
        result.then(function(msg) {

            cordova.plugins.locationManager.requestAlwaysAuthorization();

            var delegate = new cordova.plugins.locationManager.Delegate();

            delegate.didDetermineStateForRegion = function(pluginResult) {
                // navigator.notification.alert('didDetermineStateForRegion:' + JSON.stringify(pluginResult), function() {
                //     // cordova.plugins.locationManager.startRangingBeaconsInRegion(beaconRegion)
                //     //     .fail(console.error)
                //     //     .done();
                // });
            };

            delegate.didStartMonitoringForRegion = function(pluginResult) {
                //navigator.notification.alert('didStartMonitoringForRegion:' + JSON.stringify(pluginResult));
            };

            delegate.didRangeBeaconsInRegion = function(pluginResult) {
                //console.log(JSON.stringify(pluginResult));
                //cordova.plugins.locationManager.appendToDeviceLog('[DOM] didRangeBeaconsInRegion: ' + JSON.stringify(pluginResult));
            };

            delegate.didEnterRegion = function(pluginResult) {
                var beacon = pluginResult.region;

                navigator.notification.alert('ビーコンを検出しました:', function() {
                    var detailResult = beaconService.getDetail(beacon.identifier);

                    detailResult.then(function(msg) {
                        if (null === $rootScope.listDialog || $rootScope.listDialog === void 0) {
                            ons.createDialog('page/pop_list.html').then(function(dialog) {
                                $rootScope.listDialog = dialog;
                                $rootScope.listDialog.show();
                            });
                        }
                    }, function(msg) {
                        navigator.notification.alert(msg, function() {});
                    });
                });
            };

            delegate.didExitRegion = function(pluginResult) {
                var beacon = pluginResult.region;

                // navigator.notification.alert('didExitRegion:' + JSON.stringify(pluginResult));
                navigator.notification.alert('ビーコンが離れていきました', function() {
                    hikiyamaService.removeItem(beacon.identifier);
                });
            };

            cordova.plugins.locationManager.setDelegate(delegate);
            var beaconList = store.get('beacons');

            angular.forEach(beaconList, function(beacon, i) {
                var bObj = beacon.beacon;

                var beaconRegion = new cordova.plugins.locationManager.BeaconRegion(bObj.Identifier, bObj.UUID, bObj.Major, bObj.Minor);
                cordova.plugins.locationManager.startMonitoringForRegion(beaconRegion)
                    .fail(console.error)
                    .done();
            });

        }, function(msg) {
            navigator.notification.alert(msg, function() {});
        });




    });


    module.controller('ListController', function($scope, $http, SERVER_URL, beaconService, store) {

        $scope.items = store.get('hikiyamas');

        $scope.$on('hikiyama:changeList', function(data) {
            $scope.items = store.get('hikiyamas');
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

                $http.get(SERVER_URL + 'hikiyama-detail?identifier=' + identifier).then(function(response) {
                    var obj = response.data.hikiyamas[0].hikiyama;

                    var hikiyamas = store.get('hikiyamas');
                    if (hikiyamas === void 0 || hikiyamas === null) {
                        hikiyamas = [];
                    }
                    obj.identifier = identifier;
                    hikiyamas.push(obj);
                    store.set('hikiyamas', hikiyamas);

                    if (typeof callback == 'function') {
                        callback(response.data.hikiyamas.hikiyama);
                    }
                    $rootScope.$broadcast('hikiyama:changeList', hikiyamas);
                    defer.resolve('success');
                }).then(function(response) {
                    defer.reject('failure');
                });
                return defer.promise;
            }
        };
        return service;
    });

    module.factory('hikiyamaService', function($http, $q, $rootScope, $timeout, store, SERVER_URL) {
        var service = {
            addItem: function() {},
            removeItem: function(identifier) {
                var hikiyamaList = store.get('hikiyamas');

                for (var i = 0; i < hikiyamaList.length; i++) {
                    var hikiyama = hikiyamaList[i];
                    if (hikiyama.identifier == identifier) {
                        hikiyamaList.splice(i, 1);
                        store.set('hikiyamas', hikiyamaList);

                        if (hikiyamaList.length === 0) {
                            $rootScope.listDialog.hide();
                            $rootScope.listDialog = null;
                        }
                        break;
                    }
                }
                $timeout(function() {
                    $rootScope.$broadcast('hikiyama:changeList', store.get('hikiyamas'));
                }, 500);
            }
        };
        return service;
    });

    module.factory('beaconMasterService', function() {
        var service = {};

        return service;
    });
})();
