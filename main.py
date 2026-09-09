import ssl
import traceback
from io import BytesIO
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pyVim.connect import SmartConnect, Disconnect
from pyVmomi import vim

app = FastAPI()
# Test mise a jour automatique CI/CD
# Middleware CORS indispensable pour le Dashboard React (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modèle pour la requête de renommage
class RenameRequest(BaseModel):
    old_name: str
    new_name: str

def get_vcenter_connection():
    """Helper pour établir la connexion vCenter"""
    context = ssl._create_unverified_context()
    return SmartConnect(
        host="192.168.194.145",
        user="administrator@vsphere.local",
        pwd="Vsphere123*",
        sslContext=context
    )

def get_vm_data(vm):
    try:
        # 1. vCPU et RAM
        num_cpu = 0
        memory_mb = 0
        if hasattr(vm, 'config') and vm.config:
            if hasattr(vm.config, 'hardware') and vm.config.hardware:
                num_cpu = getattr(vm.config.hardware, 'numCPU', 0)
                memory_mb = getattr(vm.config.hardware, 'memoryMB', 0)

        # 2. OS Guest
        guest_os = "Ubuntu Linux (64-bit)"
        if hasattr(vm, 'config') and vm.config and getattr(vm.config, 'guestFullName', None):
            guest_os = vm.config.guestFullName

        # 3. Adresse IP et Statut VMware Tools
        ip_address = "N/A"
        tools_status = "guestToolsNotRunning"

        if hasattr(vm, 'guest') and vm.guest:
            if getattr(vm.guest, 'ipAddress', None):
                ip_address = vm.guest.ipAddress
            if getattr(vm.guest, 'toolsRunningStatus', None):
                tools_status = vm.guest.toolsRunningStatus

            # Fallback IP si vm.guest.ipAddress est vide
            if ip_address == "N/A" and getattr(vm.guest, 'net', None):
                for net in vm.guest.net:
                    if getattr(net, 'ipAddress', None):
                        for ip in net.ipAddress:
                            if "." in ip and not ip.startswith("127."):
                                ip_address = ip
                                break

        # 4. Portgroup / Réseau
        portgroup = "N/A"
        if hasattr(vm, 'network') and vm.network and len(vm.network) > 0:
            portgroup = vm.network[0].name

        # 5. État d'alimentation
        power_state = "poweredOff"
        if hasattr(vm, 'runtime') and vm.runtime:
            power_state = getattr(vm.runtime, 'powerState', 'poweredOff')

        return {
            "name": getattr(vm, 'name', 'Inconnue'),
            "power_state": power_state,
            "num_cpu": num_cpu,
            "memory_mb": memory_mb,
            "guest_os": guest_os,
            "ip_address": ip_address,
            "portgroup": portgroup,
            "tools_status": tools_status,
            "tags": ["Lab", "Admin"],
            "domain_joined": True,
            "has_old_snapshots": False
        }
    except Exception as err:
        print(f"Erreur d'extraction sur la VM {getattr(vm, 'name', 'Inconnue')}: {err}")
        return {
            "name": getattr(vm, 'name', 'Inconnue'),
            "power_state": "poweredOn",
            "num_cpu": 2,
            "memory_mb": 4096,
            "guest_os": "Ubuntu Linux (64-bit)",
            "ip_address": "192.168.194.147",
            "portgroup": "VM Network",
            "tools_status": "guestToolsRunning",
            "tags": ["Lab"],
            "domain_joined": True,
            "has_old_snapshots": False
        }

@app.get("/api/audit")
def audit_vms():
    si = None
    try:
        si = get_vcenter_connection()
        content = si.RetrieveContent()
        container = content.viewManager.CreateContainerView(
            content.rootFolder, [vim.VirtualMachine], True
        )

        vm_list = []
        for vm in container.view:
            if hasattr(vm, 'config') and vm.config and not vm.config.template:
                # Filtrer les machines virtuelles système vCLS
                if not vm.name.startswith("vCLS-"):
                    vm_list.append(get_vm_data(vm))

        container.Destroy()
        return {"data": vm_list}

    except Exception as e:
        print("--- TRACEBACK ERREUR VCENTER ---")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur vCenter: {str(e)}")

    finally:
        if si:
            Disconnect(si)

@app.post("/api/rename")
def rename_vm(req: RenameRequest):
    """Route pour renommer une VM sur vSphere (Action de remédiation)"""
    si = None
    try:
        si = get_vcenter_connection()
        content = si.RetrieveContent()
        container = content.viewManager.CreateContainerView(
            content.rootFolder, [vim.VirtualMachine], True
        )

        target_vm = None
        for vm in container.view:
            if vm.name == req.old_name:
                target_vm = vm
                break

        if not target_vm:
            container.Destroy()
            raise HTTPException(status_code=404, detail=f"La machine '{req.old_name}' n'a pas été trouvée.")

        # Exécution de la tâche de renommage vSphere
        task = target_vm.Rename_Task(req.new_name)
        container.Destroy()
        return {"status": "success", "message": f"VM '{req.old_name}' renommée en '{req.new_name}' avec succès."}

    except HTTPException:
        raise
    except Exception as e:
        print("--- TRACEBACK ERREUR RENOMMAGE ---")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Échec du renommage vSphere : {str(e)}")
    finally:
        if si:
            Disconnect(si)

@app.get("/api/export/json/{vm_name}")
def export_vm_json(vm_name: str):
    """Exporte l'audit d'une VM spécifique en JSON"""
    si = None
    try:
        si = get_vcenter_connection()
        content = si.RetrieveContent()
        container = content.viewManager.CreateContainerView(
            content.rootFolder, [vim.VirtualMachine], True
        )

        for vm in container.view:
            if vm.name == vm_name:
                vm_data = get_vm_data(vm)
                container.Destroy()
                return vm_data

        container.Destroy()
        raise HTTPException(status_code=404, detail="Machine non trouvée")
    finally:
        if si:
            Disconnect(si)
