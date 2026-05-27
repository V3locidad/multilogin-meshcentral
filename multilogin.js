/**
 * MeshCentral plugin : multilogin
 * Permet de selectionner plusieurs postes Windows et de declencher un login
 * automatique en masse via le canal KVM (CAD + saisie credentials).
 */
module.exports.multilogin = function (parent) {
    var obj = {};
    obj.parent = parent;
    obj.meshServer = parent.parent;
    obj.exports = ['onDeviceRefreshEnd'];

    obj.server_startup = function () {};

    // Injecte un onglet "Multi-Login" dans l'UI MeshCentral
    obj.onDeviceRefreshEnd = function () {
        pluginHandler.registerPluginTab({
            tabTitle: "Multi-Login",
            tabId: "pluginMultilogin"
        });
        QA('pluginMultilogin',
            '<iframe src="/pluginadmin.ashx?pin=multilogin&user=1" ' +
            'style="width:100%;height:760px;border:0"></iframe>');
    };

    // Sert la vue handlebars quand on appelle /pluginadmin.ashx?pin=multilogin
    obj.handleAdminReq = function (req, res, user) {
        res.render(
            obj.parent.path.join(__dirname, 'views/multilogin'),
            { user: user }
        );
    };

    return obj;
};
