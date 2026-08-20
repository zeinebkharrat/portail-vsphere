import ssl
import pyVmomi
from pyVim.connect import SmartConnect, Disconnect

# Paramètres de connexion au vCenter
VCENTER_IP = "192.168.194.145"
USER = "administrator@vsphere.local"
PASSWORD = "Vsphere123*"

def test_connection():
    try:
        print(f"Connexion au vCenter {VCENTER_IP}...")
        
        # Désactivation de la vérification du certificat SSL pour le Lab
        context = ssl._create_unverified_context()
        
        si = SmartConnect(
            host=VCENTER_IP,
            user=USER,
            pwd=PASSWORD,
            sslContext=context
        )
        
        content = si.RetrieveContent()
        container = content.viewManager.CreateContainerView(
            content.rootFolder, [pyVmomi.vim.VirtualMachine], True
        )
        
        print("\n✅ Connexion réussie ! Liste des VMs détectées :")
        print("-" * 50)
        for vm in container.view:
            print(f"🔹 Nom: {vm.name:<20} | État: {vm.runtime.powerState}")
            
        Disconnect(si)
    except Exception as e:
        print(f"\n❌ Erreur de connexion : {e}")

if __name__ == "__main__":
    test_connection()
