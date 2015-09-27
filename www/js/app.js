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

        // Beaconの利用権限確認
        cordova.plugins.locationManager.requestAlwaysAuthorization();

          $scope.toList = function() {
              $scope.navi.pushPage('page/list.html', {
                   animation: 'slide'
               });
          };
                      
        // サーバからビーコン情報を取得
        var result = beaconService.getList();
        var result2 = hikiyamaService.getList();

        result.then(function(msg) {
            // 曳山の取得済み
            result2.then(function(msg) {

                var delegate = new cordova.plugins.locationManager.Delegate();

                delegate.didDetermineStateForRegion = function(pluginResult) {

                    var bObj = pluginResult.region;
                    var state = pluginResult.state;
                    var beaconRegion = new cordova.plugins.locationManager.BeaconRegion(bObj.identifier, bObj.uuid, bObj.major, bObj.minor);

                    // if (beaconService.states.in === state) {
                    //     // ビーコンが内部にいる状態なので、距離の測定を行う
                    //     cordova.plugins.locationManager.startRangingBeaconsInRegion(beaconRegion)
                    //         .fail(console.error)
                    //         .done();
                    // } else {
                    //     cordova.plugins.locationManager.stopRangingBeaconsInRegion(beaconRegion)
                    //         .fail(console.error)
                    //         .done();
                    // }
                };

                delegate.didStartMonitoringForRegion = function(pluginResult) {
                    //navigator.notification.alert('didStartMonitoringForRegion:' + JSON.stringify(pluginResult));
                };

                delegate.didRangeBeaconsInRegion = function(pluginResult) {
                    var beacons = pluginResult.beacons;

                    if (beacons === void 0 || beacons.length === 0) {
                        return;
                    }

                    angular.forEach(beacons, function(beacon, i) {
                        hikiyamaService.setAccuracy(beacon.uuid, beacon.major, beacon.minor, beacon.accuracy);
                    });
                };

                delegate.didEnterRegion = function(pluginResult) {
                    var beacon = pluginResult.region;

                    navigator.notification.alert('ビーコンを検出しました:', function() {

                        var result = hikiyamaService.setPopList(beacon.identifier);

                        result.then(function(msg) {
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
                        hikiyamaService.removePopList(beacon.identifier);
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
            });



        }, function(msg) {
            navigator.notification.alert(msg, function() {});
        });
    });

    module.controller('PopListController', function($scope, $http, SERVER_URL, beaconService, hikiyamaService, store) {
        $scope.items = hikiyamaService.popList;

        $scope.$on('hikiyama:changeList', function(data) {
            $scope.items = hikiyamaService.popList;
        });

        $scope.toDetail = function() {
            $scope.navi.pushPage('page/detail.html', {
                animation: 'slide'
            });
        };
    });


    module.controller('ListController', function($scope, $http, SERVER_URL, beaconService, store) {
        $scope.items = store.get('hikiyamas');

        $scope.$on('hikiyama:changeList', function(data) {
            $scope.items = hikiyamaService.popList;
        });

        $scope.toDetail = function() {
            $scope.navi.pushPage('page/detail.html', {
                animation: 'slide'
            });
        };
    });
 
    module.controller('DetailController', function($scope, $http, SERVER_URL, beaconService, store) {
                   
       $scope.items = store.get('hikiyamas');
       
                      $('.bxslider').bxSlider({
                          mode: 'horizontal',
                          controls: false,
                          captions: false
                      });
                      
                      
                      
                      
                      $('.accordionMod').accordion({
                           classHead:'.title',
                           classBody:'.in',
                           classToggle:'on'
                       });
                      

      
   });

    /**
     * Beacon情報関連のService
     *
     */
    module.factory('beaconService', function($http, $q, $rootScope, $timeout, store, SERVER_URL) {
        var service = {
            detailObj: null,
            states: {
                'in': 'CLRegionStateInside',
                'out': 'CLRegionStateOutside'
            },
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
                    // 曳山との距離
                    obj.accu = '接近中！！';
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
            // 近くの曳山用変数
            popList: [],
            getList: function() {
                var defer = $q.defer();

                $http.get(SERVER_URL + 'hikiyama-detail').then(function(response) {
                    store.set('hikiyamas', response.data.hikiyamas);

                    defer.resolve('success');
                }).then(function(response) {
                    defer.reject('failure');
                });
                return defer.promise;

            },
            setPopList: function(identifier) {
                var defer = $q.defer();

                // 既に登録されていないか確認
                for (var i = 0; i < service.popList.length; i++) {
                    var obj = service.popList[i];
                    if (obj.identifier === identifier) {
                        defer.resolve('success');
                        return defer.promise; // 既に設定されているためスルーする
                    }
                }

                // ストレージから該当の曳山を取得
                var hikiyamaList = store.get('hikiyamas');
                for (var i = 0; i < hikiyamaList.length; i++) {
                    var hikiyama = hikiyamaList[i];
                    if (hikiyama.hikiyama.beaconPathAlias === identifier) {
                        hikiyama.hikiyama.accu = '接近中!!';
                        service.popList.push(hikiyama); // 近くの曳山一覧に追加
                        defer.resolve('success');
                        $timeout(function() {
                            $rootScope.$broadcast('hikiyama:changeList', service.popList);
                        }, 100);
                        break;
                    }
                }
                return defer.promise;
            },
            removePopList: function(identifier) {
                for (var i = 0; i < service.popList.length; i++) {
                    var hikiyama = service.popList[i];
                    if (hikiyama.hikiyama.identifier == identifier) {
                        service.popList.splice(i, 1);

                        if (service.popList.length === 0) {
                            $rootScope.listDialog.hide();
                            $rootScope.listDialog = null;
                        }
                        break;
                    }
                }
                $timeout(function() {
                    $rootScope.$broadcast('hikiyama:changeList', service.popList);
                }, 100);
            },
            addItem: function() {},
            setItem: function(identifier, obj) {
                var hikiyamaList = store.get('hikiyamas');
                for (var i = 0; i < hikiyamaList.length; i++) {
                    var hikiyama = hikiyamaList[i];
                    if (hikiyama.identifier == identifier) {
                        hikiyamaList[i] = obj;
                        store.set('hikiyamas', hikiyamaList);
                        break;
                    }
                }

            },
            setAccuracy: function(uuid, major, minor, accuracy) {
                var beacons = store.get('beacons');
                var hikiyamas = store.get('hikiyamas');

                if (beacons === void 0 || beacons.length === 0 || hikiyamas === void 0 || hikiyamas.length === 0) {
                    return;
                }

                angular.forEach(beacons, function(beacon, i) {
                    console.log('i : ' + i);
                    var bObj = beacon.beacon;
                    if (bObj.UUID.toLowerCase() == uuid.toLowerCase() && bObj.Major == major && bObj.Minor == minor) {
                        for (var j = 0; j < hikiyamas.length; j++) {
                            var hikiyama = hikiyamas[j];
                            console.log('j : ' + j);
                            console.log(JSON.stringify(bObj));
                            console.log('identifier : ' + hikiyama.identifier + ', ' + bObj.Identifier);
                            if (hikiyama.identifier == bObj.Identifier) {
                                hikiyama.accu = accuracy;
                                hikiyamas[j] = hikiyama;
                                store.set('hikiyamas', hikiyamaList);

                                $rootScope.$broadcast('hikiyama:changeList', store.get('hikiyamas'));
                                break;
                            }
                        }
                        return;
                    }
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
