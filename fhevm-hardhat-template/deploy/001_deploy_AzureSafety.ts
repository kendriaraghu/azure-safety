import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // For initial deployment, use deployer as the first admin
  // In production, replace with actual admin addresses
  const initialAdmins = [deployer];

  const deployedAzureSafety = await deploy("AzureSafety", {
    from: deployer,
    args: [initialAdmins],
    log: true,
  });

  console.log(`AzureSafety contract deployed at: ${deployedAzureSafety.address}`);
  console.log(`Initial admin: ${deployer}`);
};
export default func;
func.id = "deploy_azureSafety"; // id required to prevent reexecution
func.tags = ["AzureSafety"];

