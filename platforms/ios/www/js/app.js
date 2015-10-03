(function() {
    'use strict';
    var module = angular.module('app', ['onsen', 'angular-storage', 'ngSanitize']);
    module.constant('APP_VERSION', '1.0.0');
    module.constant('APP_NAME', '大津祭りストーリーテラー');
    module.constant('SERVER_URL', 'http://ec2-52-24-104-59.us-west-2.compute.amazonaws.com/drupal/');

    // ng-repeat完了を監視
    module.directive('bxsliderDirective', function($timeout) {
        return function(scope, element, attrs) {
            if (scope.$last) {
                $timeout(function() {
                    scope.$emit("ngRepeatFinished"); //イベント
                });
            }
        }
    });

    document.addEventListener('deviceready', function() {
        localStorage.clear();
        angular.bootstrap(document, ['app']);
    }, false);

    function obj_dump(obj) {
        var txt = '';
        for (var one in obj) {
            txt += one + "=" + obj[one] + "\n";
        }
        console.log(txt);
    }

    function is(type, obj) {
        var clas = Object.prototype.toString.call(obj).slice(8, -1);
        return obj !== undefined && obj !== null && clas === type;
    }

    module.run(function($rootScope) {
        // 2度押し対応
        $rootScope.clickExec = false;
    });


    /**
     * TOPページのコントローラ
     */
    module.controller('AppController', function($scope, $rootScope, $http, $timeout, SERVER_URL, beaconService, hikiyamaService, store) {

        // Beaconの利用権限確認
        cordova.plugins.locationManager.requestAlwaysAuthorization();

        // 一覧ページへ遷移
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
                    // ビーコンオブジェクト作成
                    var beaconRegion = new cordova.plugins.locationManager.BeaconRegion(bObj.identifier, bObj.uuid, bObj.major, bObj.minor);

                    if (beaconService.states.in === state) {
                        console.log('bObj.identifier : ' + bObj.identifier);
                        //var result = hikiyamaService.setPopList(bObj.identifier);

                        // ビーコンが内部にいる状態なので、距離の測定を行う
                        cordova.plugins.locationManager.startRangingBeaconsInRegion(beaconRegion)
                            .fail(console.error)
                            .done();
                    } else {
                        cordova.plugins.locationManager.stopRangingBeaconsInRegion(beaconRegion)
                            .fail(console.error)
                            .done();
                    }
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
                    var result = hikiyamaService.setPopList(beacon.identifier);
                };

                delegate.didExitRegion = function(pluginResult) {
                    var beacon = pluginResult.region;
                    hikiyamaService.removePopList(beacon.identifier);
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

        $scope.$on('hikiyama:changePopList', function(data) {
            $scope.items = hikiyamaService.popList;
        });

        $scope.toDetail = function(pathAlias) {
            hikiyamaService.detailObj = null;

            var result = hikiyamaService.getDetail(pathAlias);
            result.then(function() {
                $scope.popNavi.pushPage('page/pop_detail.html', {
                    animation: 'slide'
                });
            }, function() {
                navigator.notification.alert('詳細の取得に失敗しました');
            });
        };
    });

    /**
     * 一覧表示
     */
    module.controller('ListController', function($scope, $http, $timeout, SERVER_URL, beaconService, hikiyamaService, store) {
        $scope.items = store.get('hikiyamas');

        $scope.$on('hikiyama:changeList', function(data) {
            $scope.items = store.get('hikiyamas');
        });

        $scope.toDetail = function(pathAlias) {
            hikiyamaService.detailObj = null;
            var result = hikiyamaService.getDetail(pathAlias);
            result.then(function() {
                $scope.navi.pushPage('page/detail.html', {
                    animation: 'slide'
                });
            }, function() {
                navigator.notification.alert('詳細の取得に失敗しました');
            });
        };
    });

    module.controller('DetailController', function($scope, $http, $sce, SERVER_URL, beaconService, hikiyamaService, store) {
        $scope.item = hikiyamaService.detailObj;
        $scope.imageList = [];

        // 画像が一つの場合、Objectとなる
        if ($scope.item.imageURL !== void 0 && $scope.item.imageURL !== null) {
            if (is('Object', $scope.item.imageURL)) {
                $scope.imageList.push($scope.item.imageURL);
            } else if (is('Array', $scope.item.imageURL)) {
                $scope.imageList = $scope.item.imageURL;
            }
        }

        $scope.trustURL = function(src) {
            return $sce.trustAsResourceUrl(src);
        };

        $scope.$on('hikiyama:changeDetail', function(data) {
            $scope.item = hikiyamaService.detailObj;

            // 画像が一つの場合、Objectとなる
            if ($scope.item.imageURL !== void 0 && $scope.item.imageURL !== null) {
                if (is('Object', $scope.item.imageURL)) {
                    $scope.imageList.push($scope.item.imageURL);
                } else if (is('Array', $scope.item.imageURL)) {
                    $scope.imageList = $scope.item.imageURL;
                }
            }
        });

        $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
            $('.bxslider').bxSlider({
                mode: 'horizontal',
                controls: false,
                captions: false
            });
        });
        $('.accordionMod').accordion({
            classHead: '.title',
            classBody: '.in',
            classToggle: 'on'
        });
    });

    /**
     * Beacon情報関連のService
     *
     */
    module.factory('beaconService', function($http, $q, $rootScope, $timeout, store, SERVER_URL) {
        var service = {
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
        };
        return service;
    });

    module.factory('hikiyamaService', function($http, $q, $rootScope, $timeout, store, SERVER_URL) {
        var service = {
            detailObj: null,
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
            getDetail: function(pathAlias) {
                var defer = $q.defer();

                var hikiyamaList = store.get('hikiyamas');
                var hit = false;
                for (var i = 0; i < hikiyamaList.length; i++) {
                    var hikiyama = hikiyamaList[i].hikiyama;

                    if (hikiyama.beaconPathAlias == pathAlias) {
                        service.detailObj = hikiyama;
                        defer.resolve('success');
                        $rootScope.$broadcast('beacon:changeDetail', service.detailObj);
                        hit = true;
                        break;
                    }
                }
                if (hit == false) {
                    defer.reject('error');
                }
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
                            $rootScope.$broadcast('hikiyama:changePopList', service.popList);
                        }, 100);

                        if (null === $rootScope.listDialog || $rootScope.listDialog === void 0) {
                            ons.createDialog('page/pop_list.html').then(function(dialog) {
                                $rootScope.listDialog = dialog;
                                $rootScope.listDialog.show();
                            });
                        }
                        break;
                    }
                }
                return defer.promise;
            },
            removePopList: function(identifier) {
                for (var i = 0; i < service.popList.length; i++) {

                    var hikiyama = service.popList[i];
                    if (hikiyama.hikiyama.beaconPathAlias == identifier) {
                        service.popList.splice(i, 1);

                        if (service.popList.length === 0) {
                            $rootScope.listDialog.hide();
                            $rootScope.listDialog = null;
                        }
                        break;
                    }
                }
                $timeout(function() {
                    $rootScope.$broadcast('hikiyama:changePopList', service.popList);
                }, 100);
            },
            setAccuracy: function(uuid, major, minor, accuracy) {
                var beacons = store.get('beacons');

                if (beacons === void 0 || beacons.length === 0 || service.popList === void 0 || service.popList === 0) {
                    return;
                }

                angular.forEach(beacons, function(beacon, i) {
                    var bObj = beacon.beacon;
                    if (bObj.UUID.toLowerCase() == uuid.toLowerCase() && bObj.Major == major && bObj.Minor == minor) {
                        for (var j = 0; j < service.popList.length; j++) {
                            var hikiyama = service.popList[j];
                            if (hikiyama.hikiyama.beaconPathAlias == bObj.Identifier) {
                                hikiyama.hikiyama.accu = accuracy + ' m';
                                service.popList[j] = hikiyama;

                                $timeout(function() {
                                    $rootScope.$broadcast('hikiyama:changePopList', service.popList);
                                }, 100);
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
})();
