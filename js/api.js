(function(doc) {

    function xhr(url, method, params) {
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open(method, url);

            var paramsString = serializeFormParameters(params);

            xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

            xhr.onload = function() {
                if (xhr.status !== 200) { reject(new Error(xhr.responseText, xhr.status)); }
                resolve(xhr.responseText);
            };
            xhr.onerror = reject;

            xhr.send(paramsString);
        });
    }

    function getJSON(url) {
        return xhr(url, "get", null).then(function(data) {
            return(data);
        }).then(JSON.parse);
    }

    function serializeFormParameters(parameters) {
        if (!parameters) { return parameters; }
        return Object.keys(parameters).map(function(result, key) {
            var cValue = parameters[key];
            return key + "=" + cValue;
        }).join("&");
    }

    window.addEventListener("load", function apiOnDomReady() {

        var loading = doc.querySelector(".loading")
          , errorDiv = doc.querySelector(".error")
          , errorMessage = errorDiv.querySelector(".message")
          ;

        function getAllRepos(user, page, repos) {
            page = page || 1;
            repos = repos || [];
            if (localStorage[user]) { return Promise.resolve(JSON.parse(localStorage[user])); }
            return getJSON("https://api.github.com/users/" + user + "/repos?per_page=100&page=" + page).then(function (newRepos) {
                if (newRepos.length) {
                    repos = repos.concat(newRepos);
                    return getAllRepos(user, ++page, repos);
                }

                repos = repos.filter(function (c) {
                    return !c.fork;
                });

                if (!repos.length) {
                    return Promise.reject(new Error("This user doesn't have any repositories."));
                }

                try {
                    localStorage[user] = JSON.stringify(repos);
                } catch (e) {
                    localStorage.clear();
                }

                return repos;
            }).catch(function(err) {
                if (err.id < 400 || err.id > 600) { throw err; }
                var message = null;
                try {
                    message = JSON.parse(err.message);
                } catch (jsonErr) {
                    throw err; // The error is not JSON, move on.
                }
                return Promise.reject(new Error(message.message));
            });
        }

        var user = location.search.replace(/^\?@?/g, "");
        if (!user) {
            return;
        }

        loading.classList.add("visible");

        getAllRepos(user).then(function (repos) {
            loading.classList.remove("visible");
            errorDiv.classList.remove("visible");
            var languages = {};
            repos.forEach(function (c) {
                languages[c.language] = languages[c.language] || 0;
                ++languages[c.language];
            });

            if (languages["null"]) {
                languages.Others = languages["null"];
                delete languages["null"];
            }

            var arr = Object.keys(languages).map(function (cLang) {
                return {
                    title: cLang
                  , value: languages[cLang]
                  , color: GH_COLORS[cLang]
                };
            });

            arr.sort(function (a, b) {
                return a.value < b.value ? 1 : -1;
            });

            drawPieChart.call(doc.querySelector("#pieChart"), arr, {
                legend: true
            });
        }).catch(function (err) {
            loading.classList.remove("visible");
            errorDiv.classList.add("visible");
            errorMessage.textContent = err || "This user doesn't have any repositories.";
            throw err; // So that it shows in the console.
        });
    });
})(document);
