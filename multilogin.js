/**
 * MeshCentral plugin: multilogin
 * Lets an admin select multiple Windows computers and trigger an automated
 * login on each via the KVM channel (Ctrl+Alt+Del + typed credentials).
 * Saved accounts are stored on the server so all admins share the same list.
 */
var fs = require('fs');
var path = require('path');

module.exports.multilogin = function (parent) {
    var obj = {};
    obj.parent = parent;
    obj.meshServer = parent.parent;
    obj.exports = ['onDeviceRefreshEnd'];

    var accountsFile = path.join(__dirname, 'accounts.json');

    function loadAccounts() {
        try { return JSON.parse(fs.readFileSync(accountsFile, 'utf8')); }
        catch (e) { return []; }
    }
    function saveAccounts(list) {
        try { fs.writeFileSync(accountsFile, JSON.stringify(list, null, 2)); return true; }
        catch (e) { return false; }
    }

    obj.server_startup = function () {};

    // Injects a "Multi-Login" tab into the device view.
    // The iframe is created only once: re-creating it on every device refresh
    // would tear down the running KVM session in the middle of a sequence.
    obj.onDeviceRefreshEnd = function () {
        pluginHandler.registerPluginTab({
            tabTitle: "Multi-Login",
            tabId: "pluginMultilogin"
        });
        var container = document.getElementById('pluginMultilogin');
        if (container && !container.querySelector('iframe')) {
            QA('pluginMultilogin',
                '<iframe src="/pluginadmin.ashx?pin=multilogin&user=1" ' +
                'style="width:100%;height:760px;border:0"></iframe>');
        }
    };

    obj.handleAdminReq = function (req, res, user) {
        var action = req.query && req.query.action;

        // List saved accounts (GET)
        if (action === 'list') {
            res.set('Content-Type', 'application/json');
            res.send(JSON.stringify(loadAccounts()));
            return;
        }

        // Save or update an account (accepts POST body or GET query params)
        if (action === 'save') {
            var b = (req.body && typeof req.body === 'object') ? req.body : req.query;
            var name = b.name, u = b.user, p = b.pass;
            if (!name || !u || p === undefined) {
                res.status(400).set('Content-Type', 'application/json').send(JSON.stringify({ error: 'missing params' }));
                return;
            }
            var list = loadAccounts();
            var idx = list.findIndex(function (a) { return a.name === name; });
            var entry = { name: name, user: u, pass: p, updatedBy: (user && user.name) || '?', updatedAt: new Date().toISOString() };
            if (idx >= 0) list[idx] = entry; else list.push(entry);
            saveAccounts(list);
            res.set('Content-Type', 'application/json').send(JSON.stringify({ ok: true }));
            return;
        }

        // Delete an account by name
        if (action === 'delete') {
            var bd = (req.body && typeof req.body === 'object') ? req.body : req.query;
            var dname = bd.name;
            if (!dname) {
                res.status(400).set('Content-Type', 'application/json').send(JSON.stringify({ error: 'missing name' }));
                return;
            }
            var filtered = loadAccounts().filter(function (a) { return a.name !== dname; });
            saveAccounts(filtered);
            res.set('Content-Type', 'application/json').send(JSON.stringify({ ok: true }));
            return;
        }

        // Default: serve the plugin view
        res.render(path.join(__dirname, 'views/multilogin'), { user: user });
    };

    return obj;
};
