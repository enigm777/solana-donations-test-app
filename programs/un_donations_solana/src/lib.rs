use anchor_lang::prelude::*;

declare_id!("99YgW3iUUTZYsZWyaneNZreF3x86NqByKzcE6vAtwMkm");

#[program]
pub mod un_donations_solana {
    use super::*;
    use anchor_lang::solana_program::{
        system_instruction::{transfer}
    };

    pub fn initialize(ctx: Context<Initialize>, bump: u8) -> Result<()> {
        msg!("Initialize function called!");
        let donation_storage = &mut ctx.accounts.donation_storage;
        donation_storage.bump = bump;
        let donation_wallet = &mut ctx.accounts.donation_wallet;
        donation_wallet.authority = ctx.accounts.creator.key();
        Ok(())
    }

    pub fn make_donation(ctx: Context<MakeDonation>, amount: u64) -> Result<()> {
        let from_pubkey = &ctx.accounts.user.key();
        let to_pubkey = &ctx.accounts.donation_wallet.key();

        transfer(from_pubkey, to_pubkey, amount);
        msg!("Donation transaction from {} to {} amount = {}", *from_pubkey, *to_pubkey, amount);

        let donation_storage = &mut ctx.accounts.donation_storage;
        let donation = Donation {
            user_id : ctx.accounts.user.key(),
            amount: amount,
        };
        donation_storage.donations.push(donation);
        Ok(())
    }

    pub fn withdraw_donations(ctx: Context<WithdrawDonations>, lamports: u64) -> Result<()> {
        let donation_wallet_key = &ctx.accounts.donation_wallet.key();
        let owner_key = &ctx.accounts.authority.key();
        transfer(donation_wallet_key, owner_key, lamports);
        msg!("Donations withdrawal to {} amount = {}", *owner_key, lamports);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(bump:u8)]
pub struct Initialize<'info> {
    #[account(
        init, 
        payer = creator,
        space = 8 + 64
    )]
    pub donation_wallet: Account<'info, DonationWallet>,
    #[account(
        seeds = [b"donationStorage".as_ref()],
        bump,
        init, 
        payer = creator, 
        space = 64 + 8 + 8
    )]
    pub donation_storage: Account<'info, DonationStorage>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MakeDonation<'info> {
    #[account(mut)]
    pub donation_wallet: Account<'info, DonationWallet>,
    #[account(mut)]
    pub donation_storage: Account<'info, DonationStorage>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct WithdrawDonations<'info> {
    #[account(mut, has_one = authority)]
    pub donation_wallet: Account<'info, DonationWallet>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct DonatorsList<'info> {
    pub donation_storage: Account<'info, DonationStorage>
}

#[derive(Accounts)]
pub struct UserDonations<'info> {
    pub donation_storage: Account<'info, DonationStorage>,
}

#[account]
#[derive(Default)]
pub struct DonationWallet {
    pub authority: Pubkey,
}

#[account]
#[derive(Default)]
pub struct DonationStorage {
    pub donations: Vec<Donation>,
    pub bump: u8,
}

#[derive(
    Default,
    Clone,
    AnchorSerialize,
    AnchorDeserialize
)]
pub struct Donation {
    pub user_id: Pubkey,
    pub amount: u64,
}