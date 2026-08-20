import ssl
import pyVmomi
from pyVim.connect import SmartConnect, Disconnect

VCENTER_IP = "192.168.194.145"
USER = "administrator@vsphere.local"
PASSWORD = "Vsphere123*"

def check_vm_compliance(vm):
    # Dictionnaire de résultat pour la VM
    results = {
        "name": vm.name,
        "power_state": vm.runtime.powerState,
        "rules": {}
    }
    
    # -------------------------------------------------------------
    # Règle 1 : Convention de nommage (doit commencer par VM- ou vm-)
    # -------------------------------------------------------------
    is_name_valid = vm.name.lower().startswith("vm-")
    results["rules"]["naming_convention"] = {
        "status": "PASS" if is_name_valid else "FAIL",
        "detail": f"Nom: '{vm.name}' (Attendu: préfixe 'vm-')"
    }
    
    # -------------------------------------------------------------
    # Règle 2 : État des VMware Tools
    # -------------------------------------------------------------
    tools_status = vm.guest.toolsRunningStatus
    is_tools_ok = tools_status == "guestToolsRunning"
    results["rules"]["vmware_tools"] = {
        "status": "PASS" if is_tools_ok else "FAIL",
        "detail": f"Statut Tools: {tools_status}"
    }

    # -------------------------------------------------------------
    # Règle 3 : Présence de Snapshots
    # -------------------------------------------------------------
    has_snapshot = vm.snapshot is not None
    results["rules"]["snapshot_check"] = {
        "status": "WARNING" if has_snapshot else "PASS",
        "detail": "Snapshot détecté" if has_snapshot else "Aucun snapshot"
    }

    return results

def run_audit():
    context = ssl._create_unverified_context()
    si = SmartConnect(host=VCENTER_IP, user=USER, pwd=PASSWORD, sslContext=context)
    content = si.RetrieveContent()
    
    container = content.viewManager.CreateContainerView(
        content.rootFolder, [pyVmomi.vim.VirtualMachine], True
    )

    print("\n" + "="*60)
    print(" RAPPORT DE CONFORMITÉ VSPHERE")
    print("="*60)

    for vm in container.view:
        # On ignore les VMs système internes de VMware vCLS
        if vm.name.startswith("vCLS"):
            continue

        audit = check_vm_compliance(vm)
        print(f"\n🖥️VM: {audit['name']} [{audit['power_state']}]")
        print("-" * 40)
        
        for rule, data in audit["rules"].items():
            icon = "✅" if data["status"] == "PASS" else ("⚠️" if data["status"] == "WARNING" else "❌")
            print(f"  {icon} {rule:<20} : {data['status']:<7} | {data['detail']}")

    Disconnect(si)

if __name__ == "__main__":
    run_audit()
